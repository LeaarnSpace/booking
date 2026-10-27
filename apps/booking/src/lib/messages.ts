// Sends queued messages (see @learnspace/bookings outbox): writes each email from its template, or each Slack
// post, and hands it to the provider set up in settings. Customer emails need EMAIL_DRIVER; Slack posts need
// CHAT_DRIVER=slack and SLACK_WEBHOOK_URL. A message whose provider isn't set up is skipped. A message that
// fails isn't tried again unless MESSAGE_RETRIES allows it (see deliverOutbox).
import { after } from "next/server";
import type { ChatMessage, ChatSender } from "@learnspace/chat";
import { createChatFromEnv } from "@learnspace/chat/factory";
import { deliverOutbox, getMessageSettings, type QueuedMessage } from "@learnspace/bookings";
import { MESSAGES, type MessageId } from "@learnspace/bookings/client";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingDeclinedEmail,
  bookingRequestedEmail,
  formatAmount,
  formatSlot,
  holdEndedEmail,
  learnSpaceBrand as brand,
  receiptReceivedEmail,
} from "@learnspace/email/templates";
import { getSender } from "./email";
import { env } from "./env";

let chat: Promise<ChatSender | null> | undefined;
const getChat = () => (chat ??= createChatFromEnv(process.env, { production: env.production }));

const appLink = (path: string) => new URL(path, env.appUrl).toString();
const backofficeLink = (path: string) => (env.backofficeUrl ? new URL(path, env.backofficeUrl).toString() : null);

function writeEmail(id: MessageId, p: QueuedMessage["payload"]) {
  const base = { brand, name: p.to.name, booking: p.booking };
  const ref = p.booking.ref;
  switch (id) {
    case "email.requested":
      return bookingRequestedEmail({
        ...base,
        holdExpiresAt: p.booking.holdExpiresAt ?? p.booking.start,
        payment: env.payment,
        payUrl: appLink(`/bookings/${ref}/pay`),
      });
    case "email.receipt-received":
      return receiptReceivedEmail({ ...base, bookingUrl: appLink(`/bookings/${ref}`) });
    case "email.confirmed":
      return bookingConfirmedEmail({
        ...base,
        bookingUrl: appLink(`/bookings/${ref}`),
        calendarUrl: appLink(`/bookings/${ref}/calendar`),
        address: env.support.address,
      });
    case "email.declined":
      return bookingDeclinedEmail({
        ...base,
        reason: p.reason ?? "Other",
        note: p.note ?? null,
        bookingUrl: appLink(`/bookings/${ref}`),
      });
    case "email.cancelled":
      return bookingCancelledEmail({ ...base, bookUrl: appLink("/book") });
    case "email.hold-ended":
      return holdEndedEmail({ ...base, released: Boolean(p.released), bookUrl: appLink("/book") });
    default:
      throw new Error(`No email template for ${id}`);
  }
}

/** Slack posts carry the booking reference, space, time and amount, but no names, emails or phone numbers */
function writeChat(id: MessageId, payload: QueuedMessage["payload"]): ChatMessage {
  const b = payload.booking;
  const what = b.service ? `${b.service} · ${b.space}` : b.space;
  const link = backofficeLink(`/bookings/${b.ref}`);
  const lines = [what, formatSlot(brand, b), ...(b.amount ? [formatAmount(brand, b.amount)] : [])];
  const titles: Partial<Record<MessageId, string>> = {
    "slack.requested": `New booking request: ${b.ref}`,
    "slack.receipt-uploaded": `Receipt to review: ${b.ref}`,
    "slack.cancelled": `Booking cancelled: ${b.ref}`,
    "slack.hold-ended": `Hold ran out: ${b.ref}`,
  };
  const title = titles[id];
  if (!title) throw new Error(`No Slack message for ${id}`);
  return {
    title,
    lines,
    link: link ? { label: id === "slack.receipt-uploaded" ? "Review" : "Open", url: link } : undefined,
  };
}

async function sendOne(row: QueuedMessage, settings: Record<MessageId, boolean>) {
  const info = MESSAGES.find((m) => m.id === row.message);
  // Switched off since it was queued
  if (!info || !settings[row.message]) return "skipped" as const;
  if (info.channel === "email") {
    if (!env.email) return "skipped" as const;
    const { subject, text, html } = writeEmail(row.message, row.payload);
    await (
      await getSender()
    ).send({
      from: env.mailFrom,
      to: [row.payload.to],
      replyTo: { email: env.support.email, name: env.mailFrom.name },
      subject,
      text,
      html,
    });
    return "sent" as const;
  }
  const sender = await getChat();
  if (!sender) return "skipped" as const;
  await sender.send(writeChat(row.message, row.payload));
  return "sent" as const;
}

/** Sends what's due now, and returns how it went */
export async function sendQueuedMessages() {
  const settings = await getMessageSettings();
  return deliverOutbox((row) => sendOne(row, settings), { retries: env.messageRetries });
}

/** After the response: send the messages a change just queued, without making the customer wait */
export function sendQueuedMessagesSoon() {
  after(async () => {
    try {
      await sendQueuedMessages();
    } catch (error) {
      // They stay queued, and go out with the next change's messages
      console.error("Sending queued messages failed", error);
    }
  });
}
