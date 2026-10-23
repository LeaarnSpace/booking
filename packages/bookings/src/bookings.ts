// Making and managing bookings, as customers do it in the booking app. Every change runs in a transaction
// with the space row locked, so availability and add-on stock checks can't race each other; the exclusion
// constraint on the booking table is the final guard against double-booking.
import { and, asc, desc, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";
import { canBook, type Interval } from "./availability.ts";
import { db, type BookingDatabase } from "./db.ts";
import { priceBooking } from "./pricing.ts";
import { addOn, bookingAddOn, bookingTable, lengthDiscount, notification, service, space } from "./schema.ts";
import { lagosIsoDate } from "./time.ts";
import { ACTIVE_STATUSES, type BookingStatus, type Channel, type PriceBreakdown, type Receipt } from "./types.ts";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

type Tx = Parameters<Parameters<BookingDatabase["transaction"]>[0]>[0];

/** Postgres error code, whether or not Drizzle wrapped the error */
const pgCode = (e: unknown): string | undefined => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
};

/** Holds that ran out release their slot. Runs before anything that depends on availability. */
async function expireHolds(tx: Tx | BookingDatabase, spaceId?: string) {
  await tx
    .update(bookingTable)
    .set({ status: "expired", decision: { action: "released", by: "Hold ran out", at: new Date().toISOString() } })
    .where(
      and(
        eq(bookingTable.status, "hold"),
        lte(bookingTable.holdExpiresAt, sql`now()`),
        spaceId ? eq(bookingTable.spaceId, spaceId) : undefined,
      ),
    );
}

/** Time ranges already taken in a space between `from` and `to` */
export async function busyIntervals(
  spaceId: string,
  from: Date,
  to: Date,
  tx: Tx | BookingDatabase = db,
): Promise<Interval[]> {
  return tx
    .select({ start: bookingTable.startsAt, end: bookingTable.endsAt })
    .from(bookingTable)
    .where(
      and(
        eq(bookingTable.spaceId, spaceId),
        inArray(bookingTable.status, ACTIVE_STATUSES),
        lt(bookingTable.startsAt, to),
        gt(bookingTable.endsAt, from),
        // Holds that have run out but haven't been swept yet don't count
        sql`(${bookingTable.status} <> 'hold' or ${bookingTable.holdExpiresAt} > now())`,
      ),
    )
    .orderBy(asc(bookingTable.startsAt));
}

export interface ScheduleEntry {
  spaceId: string;
  spaceName: string;
  /** Service name, or the space name when booked without one */
  label: string;
  start: Date;
  end: Date;
  /** The viewer's own booking: shown with its ref; other people's bookings show only what's booked */
  mine: boolean;
  ref: string | null;
  status: BookingStatus;
}

/** Everything booked in the given spaces between `from` and `to`, for the availability calendar */
export async function listSchedule(input: { spaceIds: string[]; from: Date; to: Date; viewerId: string | null }) {
  if (!input.spaceIds.length) return [];
  const rows = await db
    .select({
      ref: bookingTable.ref,
      customerId: bookingTable.customerId,
      spaceId: bookingTable.spaceId,
      spaceName: space.name,
      serviceName: service.name,
      start: bookingTable.startsAt,
      end: bookingTable.endsAt,
      status: bookingTable.status,
    })
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .where(
      and(
        inArray(bookingTable.spaceId, input.spaceIds),
        inArray(bookingTable.status, ACTIVE_STATUSES),
        lt(bookingTable.startsAt, input.to),
        gt(bookingTable.endsAt, input.from),
        sql`(${bookingTable.status} <> 'hold' or ${bookingTable.holdExpiresAt} > now())`,
      ),
    )
    .orderBy(asc(bookingTable.startsAt));
  return rows.map((r): ScheduleEntry => ({
    spaceId: r.spaceId,
    spaceName: r.spaceName,
    label: r.serviceName ?? r.spaceName,
    start: r.start,
    end: r.end,
    mine: r.customerId === input.viewerId,
    ref: r.customerId === input.viewerId ? r.ref : null,
    status: r.status,
  }));
}

/** Add-ons for a space with how many are still free during [start, end) */
export async function addOnsLeft(spaceId: string, start: Date, end: Date, tx: Tx | BookingDatabase = db) {
  const used = tx
    .select({ addOnId: bookingAddOn.addOnId, used: sql<number>`sum(${bookingAddOn.quantity})::int`.as("used") })
    .from(bookingAddOn)
    .innerJoin(bookingTable, eq(bookingTable.ref, bookingAddOn.bookingRef))
    .where(
      and(
        eq(bookingTable.spaceId, spaceId),
        inArray(bookingTable.status, ACTIVE_STATUSES),
        lt(bookingTable.startsAt, end),
        gt(bookingTable.endsAt, start),
        sql`(${bookingTable.status} <> 'hold' or ${bookingTable.holdExpiresAt} > now())`,
      ),
    )
    .groupBy(bookingAddOn.addOnId)
    .as("used");
  const rows = await tx
    .select({ addOn, used: used.used })
    .from(addOn)
    .leftJoin(used, eq(used.addOnId, addOn.id))
    .where(and(eq(addOn.spaceId, spaceId), eq(addOn.active, true)))
    .orderBy(asc(addOn.sortOrder), asc(addOn.name));
  return rows.map((r) => ({ ...r.addOn, left: Math.max(0, r.addOn.stock - (r.used ?? 0)) }));
}

export interface NewBooking {
  customer: { id: string; name: string; email: string; isStaff: boolean };
  spaceId: string;
  serviceId: string | null;
  start: Date;
  hours: number;
  attendees: number;
  attendeeNames: string[];
  contactPhone: string | null;
  purpose: string;
  addOns: { id: string; quantity: number }[];
  /** How long a customer has to upload a receipt */
  holdMinutes: number;
  channel?: Channel;
  createdBy?: string | null;
}

const randomDigits = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10_000).padStart(4, "0");

/** "LS-2008-4821" for a slot on 20 August */
const makeRef = (start: Date) => {
  const [, month, day] = lagosIsoDate(start).split("-");
  return `LS-${day}${month}-${randomDigits()}`;
};

/**
 * Books a slot. Customers get a hold that lasts `holdMinutes` while they pay and upload a receipt; staff
 * bookings are free and confirmed at once.
 */
export async function createBooking(input: NewBooking): Promise<Result<{ ref: string; status: BookingStatus }>> {
  const now = new Date();
  const end = new Date(input.start.getTime() + input.hours * 60 * 60_000);
  try {
    return await db.transaction(async (tx) => {
      // One booking at a time per space: later checks see everything committed before them
      const [found] = await tx.select().from(space).where(eq(space.id, input.spaceId)).for("update");
      if (!found || (found.visibility === "staff" && !input.customer.isStaff)) {
        return { ok: false, error: "That space isn't available to book" } as const;
      }
      if (input.hours < found.minHours) {
        return { ok: false, error: `Book at least ${found.minHours} hour${found.minHours === 1 ? "" : "s"}` } as const;
      }
      if (input.attendees < 1 || input.attendees > found.capacity) {
        return { ok: false, error: `Up to ${found.capacity} people can use this space` } as const;
      }

      let rate = found.hourlyRate;
      if (input.serviceId) {
        const [svc] = await tx
          .select()
          .from(service)
          .where(and(eq(service.id, input.serviceId), eq(service.spaceId, found.id), eq(service.active, true)));
        if (!svc) return { ok: false, error: "That service isn't available" } as const;
        rate = svc.hourlyRate;
      }

      await expireHolds(tx, found.id);
      const dayStart = new Date(input.start.getTime() - 24 * 60 * 60_000);
      const busy = await busyIntervals(found.id, dayStart, new Date(end.getTime() + 24 * 60 * 60_000), tx);
      if (!canBook(found, input.start, input.hours, busy, now)) {
        return { ok: false, error: "That time isn't free any more. Please pick another slot." } as const;
      }

      const wanted = input.addOns.filter((a) => a.quantity > 0);
      const stock = await addOnsLeft(found.id, input.start, end, tx);
      const chosen: { addOn: (typeof stock)[number]; quantity: number }[] = [];
      for (const w of wanted) {
        const item = stock.find((s) => s.id === w.id);
        if (!item) return { ok: false, error: "One of the add-ons isn't available" } as const;
        if (w.quantity > item.left) {
          return { ok: false, error: `Only ${item.left} ${item.name} left for that time` } as const;
        }
        chosen.push({ addOn: item, quantity: w.quantity });
      }

      const price: PriceBreakdown = priceBooking({
        hourlyRate: rate,
        hours: input.hours,
        discounts: await tx
          .select({ hours: lengthDiscount.hours, percent: lengthDiscount.percent })
          .from(lengthDiscount)
          .where(eq(lengthDiscount.spaceId, found.id)),
        addOns: chosen,
        free: input.customer.isStaff,
      });
      // Staff bookings, and anything that costs nothing, don't need a receipt
      const status: BookingStatus = input.customer.isStaff || price.total === 0 ? "confirmed" : "hold";

      for (let attempt = 0; ; attempt++) {
        const ref = makeRef(input.start);
        try {
          await tx.transaction(async (inner) => {
            await inner.insert(bookingTable).values({
              ref,
              customerId: input.customer.id,
              spaceId: found.id,
              serviceId: input.serviceId,
              startsAt: input.start,
              endsAt: end,
              status,
              kind: input.customer.isStaff ? "staff" : "user",
              channel: input.channel ?? "app",
              createdBy: input.createdBy ?? null,
              attendees: input.attendees,
              attendeeNames: input.attendeeNames,
              contactName: input.customer.name,
              contactEmail: input.customer.email,
              contactPhone: input.contactPhone,
              purpose: input.purpose,
              price,
              amount: price.total,
              holdExpiresAt: status === "hold" ? new Date(now.getTime() + input.holdMinutes * 60_000) : null,
              decision: status === "confirmed" ? { action: "auto", by: "Staff booking", at: now.toISOString() } : null,
            });
            if (chosen.length) {
              await inner
                .insert(bookingAddOn)
                .values(chosen.map((c) => ({ bookingRef: ref, addOnId: c.addOn.id, quantity: c.quantity })));
            }
          });
          if (status === "confirmed") {
            await notify(tx, input.customer.id, ref, "Booking confirmed", `Your booking ${ref} is confirmed.`);
          }
          return { ok: true, ref, status } as const;
        } catch (e) {
          // Ref already used: try another number
          if (pgCode(e) === "23505" && attempt < 5) continue;
          throw e;
        }
      }
    });
  } catch (e) {
    if (pgCode(e) === "23P01") return { ok: false, error: "That time was just booked. Please pick another slot." };
    throw e;
  }
}

async function notify(tx: Tx | BookingDatabase, customerId: string, ref: string, title: string, body: string) {
  await tx.insert(notification).values({ customerId, bookingRef: ref, title, body });
}

/* ---------- The customer's own bookings ---------- */

export const CUSTOMER_TABS = ["pending", "upcoming", "past", "cancelled"] as const;
export type CustomerTab = (typeof CUSTOMER_TABS)[number];

export interface CustomerBooking {
  ref: string;
  status: BookingStatus;
  kind: "user" | "staff";
  spaceId: string;
  spaceName: string;
  serviceName: string | null;
  start: Date;
  end: Date;
  attendees: number;
  attendeeNames: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  purpose: string;
  price: PriceBreakdown;
  holdExpiresAt: Date | null;
  receipt: Receipt | null;
  /** Why staff declined the receipt (one of DECLINE_REASONS), and their note */
  declineReason: string | null;
  declineNote: string | null;
  cancelReason: string | null;
  createdAt: Date;
}

const customerColumns = {
  ref: bookingTable.ref,
  status: bookingTable.status,
  kind: bookingTable.kind,
  spaceId: bookingTable.spaceId,
  spaceName: space.name,
  serviceName: service.name,
  start: bookingTable.startsAt,
  end: bookingTable.endsAt,
  attendees: bookingTable.attendees,
  attendeeNames: bookingTable.attendeeNames,
  contactName: bookingTable.contactName,
  contactEmail: bookingTable.contactEmail,
  contactPhone: bookingTable.contactPhone,
  purpose: bookingTable.purpose,
  price: bookingTable.price,
  holdExpiresAt: bookingTable.holdExpiresAt,
  receipt: bookingTable.receipt,
  decision: bookingTable.decision,
  cancelReason: bookingTable.cancelReason,
  createdAt: bookingTable.createdAt,
};

type CustomerRow = { decision: { note?: string; reason?: string } | null } & Omit<
  CustomerBooking,
  "declineNote" | "declineReason"
>;
const toCustomerBooking = ({ decision, ...row }: CustomerRow): CustomerBooking => ({
  ...row,
  declineReason: decision?.reason ?? null,
  declineNote: decision?.note ?? null,
});

export async function listCustomerBookings(customerId: string, tab: CustomerTab, q?: string) {
  await expireHolds(db);
  const now = new Date();
  const where = {
    pending: inArray(bookingTable.status, ["hold", "pending"]),
    upcoming: and(eq(bookingTable.status, "confirmed"), gt(bookingTable.endsAt, now)),
    past: and(eq(bookingTable.status, "confirmed"), lte(bookingTable.endsAt, now)),
    cancelled: inArray(bookingTable.status, ["cancelled", "declined", "expired"]),
  }[tab];
  const search = q?.trim();
  const rows = await db
    .select(customerColumns)
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .where(
      and(
        eq(bookingTable.customerId, customerId),
        where,
        search
          ? sql`(${bookingTable.ref} ilike ${`%${search}%`} or ${space.name} ilike ${`%${search}%`} or ${service.name} ilike ${`%${search}%`})`
          : undefined,
      ),
    )
    .orderBy(tab === "upcoming" || tab === "pending" ? asc(bookingTable.startsAt) : desc(bookingTable.startsAt));
  return rows.map(toCustomerBooking);
}

export async function getCustomerBooking(customerId: string, ref: string) {
  await expireHolds(db);
  const [row] = await db
    .select(customerColumns)
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .where(and(eq(bookingTable.ref, ref), eq(bookingTable.customerId, customerId)));
  return row ? toCustomerBooking(row) : null;
}

/** After the receipt is safely in storage: the booking moves on to staff review */
export async function submitReceipt(customerId: string, ref: string, receipt: Receipt): Promise<Result> {
  return db.transaction(async (tx) => {
    await expireHolds(tx);
    const [b] = await tx
      .select()
      .from(bookingTable)
      .where(and(eq(bookingTable.ref, ref), eq(bookingTable.customerId, customerId)))
      .for("update");
    if (!b) return { ok: false, error: "Booking not found" };
    if (b.status === "expired") return { ok: false, error: "The hold on this slot ran out. Please book again." };
    if (b.status !== "hold" && b.status !== "pending")
      return { ok: false, error: "This booking doesn't need a receipt" };
    await tx
      .update(bookingTable)
      .set({ status: "pending", receipt, holdExpiresAt: null })
      .where(eq(bookingTable.ref, ref));
    await notify(
      tx,
      customerId,
      ref,
      "Receipt received",
      `We've got your receipt for ${ref} and will check it shortly.`,
    );
    return { ok: true };
  });
}

/** A declined payment can be tried again while the slot is still free: the booking goes back on hold */
export async function retryPayment(customerId: string, ref: string, holdMinutes: number): Promise<Result> {
  try {
    return await db.transaction(async (tx) => {
      const [b] = await tx
        .select()
        .from(bookingTable)
        .where(and(eq(bookingTable.ref, ref), eq(bookingTable.customerId, customerId)))
        .for("update");
      if (!b || b.status !== "declined") return { ok: false, error: "This booking can't be paid again" };
      if (b.startsAt <= new Date()) return { ok: false, error: "This slot has already started" };
      await expireHolds(tx, b.spaceId);
      await tx
        .update(bookingTable)
        .set({ status: "hold", receipt: null, holdExpiresAt: new Date(Date.now() + holdMinutes * 60_000) })
        .where(eq(bookingTable.ref, ref));
      return { ok: true };
    });
  } catch (e) {
    if (pgCode(e) === "23P01")
      return { ok: false, error: "Someone else has booked this slot since. Please book another time." };
    throw e;
  }
}

export async function cancelBooking(customerId: string, ref: string, reason: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const [b] = await tx
      .select()
      .from(bookingTable)
      .where(and(eq(bookingTable.ref, ref), eq(bookingTable.customerId, customerId)))
      .for("update");
    if (!b) return { ok: false, error: "Booking not found" };
    if (!(ACTIVE_STATUSES as readonly string[]).includes(b.status))
      return { ok: false, error: "This booking is already closed" };
    if (b.startsAt <= new Date()) return { ok: false, error: "Bookings can't be cancelled once they've started" };
    await tx
      .update(bookingTable)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason.slice(0, 300) })
      .where(eq(bookingTable.ref, ref));
    await notify(tx, customerId, ref, "Booking cancelled", `Your booking ${ref} has been cancelled.`);
    return { ok: true };
  });
}
