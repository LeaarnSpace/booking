// Emails to customers and Slack posts to staff, through an outbox: messages are queued in the same transaction
// as the booking change they're about, then sent by the app straight after the change (the database is awake
// then anyway). There's no scheduled job: a message gets one try by default and is kept as failed if that
// doesn't work, so nothing spends CPU or database time retrying. Nothing here talks to an email or chat provider:
// the app passes a function that writes and sends each message (see deliverOutbox).
import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db, type BookingDatabase } from "./db.ts";
import { bookingTable, messageSetting, notificationSettings, outbox, service, space } from "./schema.ts";
import {
  DECLINE_REASONS,
  MESSAGES,
  type Decision,
  type MessageId,
  type MessagePayload,
  NOTIFICATION_SETTINGS,
  type NotificationSetting,
} from "./types.ts";

type Tx = Parameters<Parameters<BookingDatabase["transaction"]>[0]>[0];

/** Things that happen to a booking, and the messages each one sends */
export type BookingEvent = "requested" | "confirmed" | "receipt-uploaded" | "declined" | "cancelled" | "hold-ended";

const EVENT_MESSAGES: Record<BookingEvent, MessageId[]> = {
  requested: ["email.requested", "slack.requested"],
  confirmed: ["email.confirmed", "slack.confirmed"],
  "receipt-uploaded": ["email.receipt-received", "slack.receipt-uploaded"],
  declined: ["email.declined"],
  cancelled: ["email.cancelled", "slack.cancelled"],
  "hold-ended": ["email.hold-ended", "slack.hold-ended"],
};

const messageInfo = (id: MessageId) => MESSAGES.find((m) => m.id === id)!;

/* ---------- Settings (back office) ---------- */

/** Which messages are on. Messages staff haven't changed keep their default (see MESSAGES). */
export async function getMessageSettings(tx: Tx | BookingDatabase = db): Promise<Record<MessageId, boolean>> {
  const rows = await tx.select({ id: messageSetting.id, enabled: messageSetting.enabled }).from(messageSetting);
  const chosen = new Map(rows.map((r) => [r.id, r.enabled]));
  return Object.fromEntries(MESSAGES.map((m) => [m.id, chosen.get(m.id) ?? m.defaultEnabled])) as Record<
    MessageId,
    boolean
  >;
}

/**
 * The email choices to show a customer: only those covering an email staff have switched on, so customers
 * aren't offered settings for emails that never go out.
 */
export async function customerEmailChoices() {
  const settings = await getMessageSettings();
  const used = new Set<NotificationSetting | null>(
    MESSAGES.filter((m) => m.channel === "email" && settings[m.id]).map((m) => m.customerSetting),
  );
  return NOTIFICATION_SETTINGS.filter((s) => used.has(s.id));
}

export async function setMessageSetting(id: MessageId, enabled: boolean, by: string) {
  await db
    .insert(messageSetting)
    .values({ id, enabled, updatedBy: by })
    .onConflictDoUpdate({ target: messageSetting.id, set: { enabled, updatedBy: by } });
}

/* ---------- Queuing ---------- */

/**
 * Queues the messages `event` sends for these bookings, inside the caller's transaction. Leaves out messages
 * staff have switched off, and emails the customer has turned off in their own settings.
 */
export async function queueBookingMessages(
  tx: Tx | BookingDatabase,
  event: BookingEvent,
  refs: string[],
  options: { released?: boolean } = {},
) {
  if (!refs.length) return;
  const settings = await getMessageSettings(tx);
  const ids = EVENT_MESSAGES[event].filter(
    // Staff releasing a hold know about it already; Slack only hears about holds that ran out
    (id) => settings[id] && !(id === "slack.hold-ended" && options.released),
  );
  if (!ids.length) return;

  const rows = await tx
    .select({
      ref: bookingTable.ref,
      contactName: bookingTable.contactName,
      contactEmail: bookingTable.contactEmail,
      space: space.name,
      service: service.name,
      start: bookingTable.startsAt,
      end: bookingTable.endsAt,
      amount: bookingTable.amount,
      holdExpiresAt: bookingTable.holdExpiresAt,
      kind: bookingTable.kind,
      decision: bookingTable.decision,
      prefs: notificationSettings,
    })
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .leftJoin(notificationSettings, eq(notificationSettings.customerId, bookingTable.customerId))
    .where(inArray(bookingTable.ref, refs));

  // The same thing can happen to a booking more than once (a declined payment, then another hold)
  const stamp = Date.now();
  const values = rows.flatMap((r) => {
    const decision = r.decision as Decision | null;
    const payload: MessagePayload = {
      to: { email: r.contactEmail, name: r.contactName },
      booking: {
        ref: r.ref,
        space: r.space,
        service: r.service,
        start: r.start.toISOString(),
        end: r.end.toISOString(),
        amount: r.amount,
        holdExpiresAt: r.holdExpiresAt?.toISOString() ?? null,
        staff: r.kind === "staff",
      },
      ...(event === "declined" && {
        reason: DECLINE_REASONS.find((d) => d.id === decision?.reason)?.label ?? "Other",
        note: decision?.note ?? null,
      }),
      ...(event === "hold-ended" && { released: Boolean(options.released) }),
    };
    return ids
      .filter((id) => {
        const pref = messageInfo(id).customerSetting as NotificationSetting | null;
        return !pref || (r.prefs?.[pref] ?? true);
      })
      .map((id) => ({ key: `${id}:${r.ref}:${stamp}`, message: id, payload }));
  });
  if (values.length) await tx.insert(outbox).values(values).onConflictDoNothing({ target: outbox.key });
}

/* ---------- Sending ---------- */

/** Minutes to wait before each retry, when retries are switched on */
const BACKOFF = [1, 5, 30, 120, 360, 720, 1440];

export interface QueuedMessage {
  id: number;
  message: MessageId;
  payload: MessagePayload;
  attempts: number;
}

/**
 * Sends what's due, at most `limit` messages. `send` writes and sends one message, returning "skipped" when it
 * wasn't sent on purpose (switched off since it was queued, no provider set up). Sent and skipped messages are
 * deleted. A message that fails is kept as failed for the back office to show, unless `retries` allows another
 * try: then it waits (1 minute, 5, 30, …) and goes out with whatever the app sends next, since nothing runs on
 * a schedule. Errors marked `retryable: false` (a bad address, a revoked webhook) fail at once either way.
 * Several senders can run at once: each message is claimed by one of them.
 */
export async function deliverOutbox(
  send: (message: QueuedMessage) => Promise<"sent" | "skipped">,
  { limit = 25, retries = 0 } = {},
) {
  const claimed = await db.execute<QueuedMessage & Record<string, unknown>>(sql`
    update ${outbox} set locked_until = now() + interval '2 minutes', attempts = attempts + 1
    where id in (
      select id from ${outbox}
      where status = 'pending' and next_attempt_at <= now() and (locked_until is null or locked_until < now())
      order by id limit ${limit}
      for update skip locked
    )
    returning id, message, payload, attempts`);

  const done = { sent: 0, skipped: 0, retrying: 0, failed: 0 };
  for (const row of claimed) {
    try {
      done[await send(row)]++;
      await db.delete(outbox).where(eq(outbox.id, row.id));
    } catch (e) {
      const retry =
        ((e as { retryable?: boolean }).retryable ?? true) && row.attempts <= Math.min(retries, BACKOFF.length);
      const lastError = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      await db
        .update(outbox)
        .set(
          retry
            ? { nextAttemptAt: new Date(Date.now() + BACKOFF[row.attempts - 1] * 60_000), lockedUntil: null, lastError }
            : { status: "failed", lockedUntil: null, lastError },
        )
        .where(eq(outbox.id, row.id));
      done[retry ? "retrying" : "failed"]++;
    }
  }
  // Failed messages are kept a month for the back office, then dropped (only checked when something failed)
  if (done.failed) {
    await db
      .delete(outbox)
      .where(and(eq(outbox.status, "failed"), lte(outbox.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60_000))));
  }
  return { ...done, claimed: claimed.length };
}

/** Messages that couldn't be sent (or are waiting to try again), newest first, for the back office */
export async function listFailedMessages(limit = 10) {
  return db
    .select({
      id: outbox.id,
      message: outbox.message,
      ref: sql<string>`${outbox.payload}->'booking'->>'ref'`,
      attempts: outbox.attempts,
      lastError: outbox.lastError,
      createdAt: outbox.createdAt,
      status: outbox.status,
    })
    .from(outbox)
    .where(or(eq(outbox.status, "failed"), and(eq(outbox.status, "pending"), sql`${outbox.lastError} is not null`)))
    .orderBy(desc(outbox.createdAt))
    .limit(limit);
}

/** Staff chose to send a failed message again: it goes out with the next send */
export async function retryMessage(id: number) {
  await db
    .update(outbox)
    .set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), lockedUntil: null })
    .where(and(eq(outbox.id, id), eq(outbox.status, "failed")));
}

/** Drops a failed message staff don't want to send */
export async function discardMessage(id: number) {
  await db.delete(outbox).where(and(eq(outbox.id, id), inArray(outbox.status, ["failed", "pending"])));
}
