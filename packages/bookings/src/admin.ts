// Staff operations for the back office: managing spaces and prices, and reviewing bookings. The back office
// checks the person's role before calling these; every change re-checks the record's state inside a
// transaction, since another staff member may have acted on it first.
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, lt, ne, or, sql, sum } from "drizzle-orm";
import { expireHolds as expireAllHolds } from "./bookings.ts";
import { db } from "./db.ts";
import {
  includedForServices,
  includedForSpaces,
  listIncludedItems,
  pruneIncludedItems,
  setServiceIncluded,
  setSpaceIncluded,
} from "./included.ts";
import { queueBookingMessages, type BookingEvent } from "./outbox.ts";
import { addOn, bookingMessage, bookingTable, lengthDiscount, notification, service, space } from "./schema.ts";
import {
  type BookingStatus,
  type ClosedDate,
  type DayHours,
  type DeclineReason,
  type Faq,
  type Photo,
  type Visibility,
} from "./types.ts";

export type AdminResult = { ok: true } | { ok: false; error: string };

const pgCode = (e: unknown): string | undefined => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
};

/** Holds that ran out release their slot (the daily job does this too) */
export const expireHolds = () => expireAllHolds(db);

/* ---------- Spaces ---------- */

export type SpaceRecord = typeof space.$inferSelect & {
  /** "What's included" item names, in order */
  included: string[];
};

export async function listAllSpaces(): Promise<SpaceRecord[]> {
  const rows = await db.select().from(space).orderBy(asc(space.sortOrder), asc(space.name));
  const items = await includedForSpaces(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, included: items.get(r.id) ?? [] }));
}

export async function getSpaceRecord(id: string): Promise<SpaceRecord | null> {
  const [row] = await db.select().from(space).where(eq(space.id, id));
  if (!row) return null;
  return { ...row, included: (await includedForSpaces([id])).get(id) ?? [] };
}

export { listIncludedItems };

export interface SpaceInput {
  name: string;
  tagline: string;
  description: string;
  capacity: number;
  hourlyRate: number;
  visibility: Visibility;
  hours: DayHours[];
  closedDates: ClosedDate[];
  closedOnPublicHolidays: boolean;
  included: string[];
  /** Common questions shown on the space's page */
  faqs: Faq[];
}

const slug = (name: string, fallback: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

async function nameTaken(name: string, exceptId?: string) {
  const [row] = await db
    .select({ id: space.id })
    .from(space)
    .where(and(sql`lower(${space.name}) = lower(${name})`, exceptId ? ne(space.id, exceptId) : undefined));
  return Boolean(row);
}

export async function createSpace(input: SpaceInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (await nameTaken(input.name)) return { ok: false, error: "There is already a space with that name" };
  const base = slug(input.name, "space");
  const [{ n }] = await db.select({ n: count() }).from(space);
  for (let i = 1; i < 50; i++) {
    const id = i === 1 ? base : `${base}-${i}`;
    try {
      const { included, ...fields } = input;
      await db.transaction(async (tx) => {
        await tx.insert(space).values({ ...fields, id, sortOrder: n + 1 });
        await setSpaceIncluded(tx, id, included);
      });
      return { ok: true, id };
    } catch (e) {
      if (pgCode(e) !== "23505") throw e;
    }
  }
  return { ok: false, error: "Couldn't create the space" };
}

export async function updateSpace(id: string, input: Partial<SpaceInput>): Promise<AdminResult> {
  if (input.name && (await nameTaken(input.name, id)))
    return { ok: false, error: "There is already a space with that name" };
  const { included, ...fields } = input;
  return db.transaction(async (tx) => {
    const rows = Object.keys(fields).length
      ? await tx.update(space).set(fields).where(eq(space.id, id)).returning({ id: space.id })
      : await tx.select({ id: space.id }).from(space).where(eq(space.id, id));
    if (!rows.length) return { ok: false, error: "Space not found" } as const;
    if (included) {
      await setSpaceIncluded(tx, id, included);
      await pruneIncludedItems(tx);
    }
    return { ok: true } as const;
  });
}

/* ---------- Services ---------- */

export type ServiceRecord = typeof service.$inferSelect & { included: string[]; spaceName: string };

export async function getServiceRecord(id: string): Promise<ServiceRecord | null> {
  const [row] = await db
    .select({ s: service, spaceName: space.name })
    .from(service)
    .innerJoin(space, eq(space.id, service.spaceId))
    .where(eq(service.id, id));
  if (!row) return null;
  return { ...row.s, spaceName: row.spaceName, included: (await includedForServices([id])).get(id) ?? [] };
}

export async function listServicesFor(spaceId: string) {
  const rows = await db
    .select()
    .from(service)
    .where(eq(service.spaceId, spaceId))
    .orderBy(asc(service.sortOrder), asc(service.name));
  const items = await includedForServices(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, included: items.get(r.id) ?? [] }));
}

/** The details customers read about a service: description, what's included and common questions */
export async function updateServiceDetails(
  id: string,
  input: { name: string; description: string; included: string[]; faqs: Faq[] },
): Promise<AdminResult> {
  const { included, ...fields } = input;
  return db.transaction(async (tx) => {
    const rows = await tx.update(service).set(fields).where(eq(service.id, id)).returning({ id: service.id });
    if (!rows.length) return { ok: false, error: "Service not found" } as const;
    await setServiceIncluded(tx, id, included);
    await pruneIncludedItems(tx);
    return { ok: true } as const;
  });
}

/** Changes a service's photo list in a transaction (same rules as space photos) */
async function changeServicePhotos(id: string, change: (photos: Photo[]) => Photo[] | string): Promise<AdminResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ photos: service.photos }).from(service).where(eq(service.id, id)).for("update");
    if (!row) return { ok: false, error: "Service not found" };
    const next = change(row.photos);
    if (typeof next === "string") return { ok: false, error: next };
    await tx.update(service).set({ photos: next }).where(eq(service.id, id));
    return { ok: true };
  });
}

export const addServicePhoto = (id: string, photo: Photo) =>
  changeServicePhotos(id, (photos) =>
    photos.length >= MAX_PHOTOS ? `A service can have up to ${MAX_PHOTOS} photos` : [...photos, photo],
  );

export const removeServicePhoto = (id: string, key: string) =>
  changeServicePhotos(id, (photos) => photos.filter((p) => p.key !== key));

export const makeServiceCover = (id: string, key: string) =>
  changeServicePhotos(id, (photos) => {
    const photo = photos.find((p) => p.key === key);
    return photo ? [photo, ...photos.filter((p) => p !== photo)] : "Photo not found";
  });

export const MAX_PHOTOS = 12;

/** Changes a space's photo list in a transaction, so two staff editing photos at once don't lose each other's */
async function changePhotos(id: string, change: (photos: Photo[]) => Photo[] | string): Promise<AdminResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ photos: space.photos }).from(space).where(eq(space.id, id)).for("update");
    if (!row) return { ok: false, error: "Space not found" };
    const next = change(row.photos);
    if (typeof next === "string") return { ok: false, error: next };
    await tx.update(space).set({ photos: next }).where(eq(space.id, id));
    return { ok: true };
  });
}

export const addSpacePhoto = (id: string, photo: Photo) =>
  changePhotos(id, (photos) =>
    photos.length >= MAX_PHOTOS ? `A space can have up to ${MAX_PHOTOS} photos` : [...photos, photo],
  );

/** Takes the photo off the space. The caller deletes the file from storage. */
export const removeSpacePhoto = (id: string, key: string) =>
  changePhotos(id, (photos) => photos.filter((p) => p.key !== key));

export const makeSpaceCover = (id: string, key: string) =>
  changePhotos(id, (photos) => {
    const photo = photos.find((p) => p.key === key);
    return photo ? [photo, ...photos.filter((p) => p !== photo)] : "Photo not found";
  });

/* ---------- Prices ---------- */

export interface PriceTables {
  spaces: { id: string; name: string; hourlyRate: number; hasServices: boolean }[];
  services: (typeof service.$inferSelect & { spaceName: string })[];
  addOns: (typeof addOn.$inferSelect & { spaceName: string })[];
  discounts: (typeof lengthDiscount.$inferSelect & { spaceName: string })[];
}

/** Everything that sets a price, for the back office's pricing tables */
export async function getPriceTables(): Promise<PriceTables> {
  const [spaces, services, addOns, discounts] = await Promise.all([
    db
      .select({ id: space.id, name: space.name, hourlyRate: space.hourlyRate })
      .from(space)
      .orderBy(asc(space.sortOrder), asc(space.name)),
    db
      .select({ s: service, spaceName: space.name })
      .from(service)
      .innerJoin(space, eq(space.id, service.spaceId))
      .orderBy(asc(space.sortOrder), asc(service.sortOrder), asc(service.name)),
    db
      .select({ a: addOn, spaceName: space.name })
      .from(addOn)
      .innerJoin(space, eq(space.id, addOn.spaceId))
      .orderBy(asc(space.sortOrder), asc(addOn.sortOrder), asc(addOn.name)),
    db
      .select({ d: lengthDiscount, spaceName: space.name })
      .from(lengthDiscount)
      .innerJoin(space, eq(space.id, lengthDiscount.spaceId))
      .orderBy(asc(space.sortOrder), asc(lengthDiscount.hours)),
  ]);
  return {
    spaces: spaces.map((s) => ({ ...s, hasServices: services.some((x) => x.s.spaceId === s.id) })),
    services: services.map((r) => ({ ...r.s, spaceName: r.spaceName })),
    addOns: addOns.map((r) => ({ ...r.a, spaceName: r.spaceName })),
    discounts: discounts.map((r) => ({ ...r.d, spaceName: r.spaceName })),
  };
}

const notFound = (what: string) => ({ ok: false as const, error: `${what} not found` });

export async function setSpaceRate(id: string, hourlyRate: number): Promise<AdminResult> {
  const rows = await db.update(space).set({ hourlyRate }).where(eq(space.id, id)).returning({ id: space.id });
  return rows.length ? { ok: true } : notFound("Space");
}

export async function saveService(
  id: string | null,
  input: { spaceId: string; name: string; hourlyRate: number; active: boolean; description?: string },
): Promise<AdminResult> {
  try {
    if (id) {
      const rows = await db.update(service).set(input).where(eq(service.id, id)).returning({ id: service.id });
      return rows.length ? { ok: true } : notFound("Service");
    }
    const [{ n }] = await db.select({ n: count() }).from(service).where(eq(service.spaceId, input.spaceId));
    await db
      .insert(service)
      .values({ ...input, id: `${slug(input.name, "service")}-${crypto.randomUUID().slice(0, 4)}`, sortOrder: n + 1 });
    return { ok: true };
  } catch (e) {
    if (pgCode(e) === "23503") return notFound("Space");
    throw e;
  }
}

export async function saveAddOn(
  id: string | null,
  input: { spaceId: string; name: string; description: string; price: number; stock: number; active: boolean },
): Promise<AdminResult> {
  try {
    if (id) {
      const rows = await db.update(addOn).set(input).where(eq(addOn.id, id)).returning({ id: addOn.id });
      return rows.length ? { ok: true } : notFound("Add-on");
    }
    const [{ n }] = await db.select({ n: count() }).from(addOn).where(eq(addOn.spaceId, input.spaceId));
    await db
      .insert(addOn)
      .values({ ...input, id: `${slug(input.name, "add-on")}-${crypto.randomUUID().slice(0, 4)}`, sortOrder: n + 1 });
    return { ok: true };
  } catch (e) {
    if (pgCode(e) === "23503") return notFound("Space");
    throw e;
  }
}

export async function saveDiscount(
  id: number | null,
  input: { spaceId: string; hours: number; percent: number },
): Promise<AdminResult> {
  try {
    if (id) {
      const rows = await db
        .update(lengthDiscount)
        .set(input)
        .where(eq(lengthDiscount.id, id))
        .returning({ id: lengthDiscount.id });
      return rows.length ? { ok: true } : notFound("Discount");
    }
    await db.insert(lengthDiscount).values(input);
    return { ok: true };
  } catch (e) {
    if (pgCode(e) === "23505") return { ok: false, error: "That space already has a discount for that many hours" };
    if (pgCode(e) === "23503") return notFound("Space");
    throw e;
  }
}

export async function deleteDiscount(id: number): Promise<AdminResult> {
  const rows = await db.delete(lengthDiscount).where(eq(lengthDiscount.id, id)).returning({ id: lengthDiscount.id });
  return rows.length ? { ok: true } : notFound("Discount");
}

/* ---------- Bookings ---------- */

export type BookingRecord = typeof bookingTable.$inferSelect & { spaceName: string; serviceName: string | null };

const bookingColumns = { b: bookingTable, spaceName: space.name, serviceName: service.name };
const toRecord = (r: {
  b: typeof bookingTable.$inferSelect;
  spaceName: string;
  serviceName: string | null;
}): BookingRecord => ({
  ...r.b,
  spaceName: r.spaceName,
  serviceName: r.serviceName,
});

export async function listBookingRecords(filter: {
  statuses?: BookingStatus[] | null;
  spaceId?: string;
  customerId?: string;
  q?: string;
  from?: Date;
  to?: Date;
}): Promise<BookingRecord[]> {
  await expireHolds();
  const q = filter.q?.trim();
  const rows = await db
    .select(bookingColumns)
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .where(
      and(
        filter.statuses ? inArray(bookingTable.status, filter.statuses) : undefined,
        filter.spaceId ? eq(bookingTable.spaceId, filter.spaceId) : undefined,
        filter.customerId ? eq(bookingTable.customerId, filter.customerId) : undefined,
        filter.from ? gt(bookingTable.endsAt, filter.from) : undefined,
        filter.to ? lt(bookingTable.startsAt, filter.to) : undefined,
        q
          ? or(
              ilike(bookingTable.ref, `%${q}%`),
              ilike(bookingTable.contactName, `%${q}%`),
              ilike(bookingTable.contactEmail, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(bookingTable.startsAt))
    .limit(500);
  return rows.map(toRecord);
}

export async function countByStatus(): Promise<Record<BookingStatus, number>> {
  await expireHolds();
  const rows = await db
    .select({ status: bookingTable.status, n: count() })
    .from(bookingTable)
    .groupBy(bookingTable.status);
  const counts = { hold: 0, pending: 0, confirmed: 0, declined: 0, cancelled: 0, expired: 0 } as Record<
    BookingStatus,
    number
  >;
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function getBookingRecord(ref: string) {
  await expireHolds();
  const [row] = await db
    .select(bookingColumns)
    .from(bookingTable)
    .innerJoin(space, eq(space.id, bookingTable.spaceId))
    .leftJoin(service, eq(service.id, bookingTable.serviceId))
    .where(eq(bookingTable.ref, ref));
  if (!row) return null;
  const messages = await db
    .select()
    .from(bookingMessage)
    .where(eq(bookingMessage.bookingRef, ref))
    .orderBy(asc(bookingMessage.createdAt));
  return { ...toRecord(row), messages };
}

/** How many bookings each customer has, for the customer list */
export async function bookingCountsByCustomer(): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: bookingTable.customerId, n: count() })
    .from(bookingTable)
    .groupBy(bookingTable.customerId);
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Changes a booking that must currently be in `from`, adding a notification for the customer and its messages */
async function decide(
  ref: string,
  from: BookingStatus,
  wrongState: string,
  change: (b: typeof bookingTable.$inferSelect) => Partial<typeof bookingTable.$inferInsert>,
  note?: { title: string; body: string },
  event?: { name: BookingEvent; released?: boolean },
): Promise<AdminResult> {
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(bookingTable).where(eq(bookingTable.ref, ref)).for("update");
    if (!b) return { ok: false, error: "Booking not found" };
    if (b.status !== from || (from === "hold" && b.holdExpiresAt && b.holdExpiresAt <= new Date())) {
      return { ok: false, error: wrongState };
    }
    await tx.update(bookingTable).set(change(b)).where(eq(bookingTable.ref, ref));
    if (note) await tx.insert(notification).values({ customerId: b.customerId, bookingRef: ref, ...note });
    if (event) await queueBookingMessages(tx, event.name, [ref], { released: event.released });
    return { ok: true };
  });
}

export const approveBooking = (ref: string, by: string) =>
  decide(
    ref,
    "pending",
    "Only bookings waiting for review can be approved",
    () => ({ status: "confirmed", decision: { action: "approved", by, at: new Date().toISOString() } }),
    { title: "Booking confirmed", body: `Your payment for ${ref} has been verified and your booking is confirmed.` },
    { name: "confirmed" },
  );

export const declineBooking = (ref: string, by: string, reason: DeclineReason, note?: string) =>
  decide(
    ref,
    "pending",
    "Only bookings waiting for review can be declined",
    () => ({ status: "declined", decision: { action: "declined", by, at: new Date().toISOString(), reason, note } }),
    {
      title: "Receipt couldn’t be verified",
      body: note || `We couldn't verify the receipt for ${ref}. You can upload a new one from My Bookings.`,
    },
    { name: "declined" },
  );

export const extendHold = (ref: string, minutes: number) =>
  decide(ref, "hold", "This hold has already ended", (b) => ({
    holdExpiresAt: new Date(Math.max(b.holdExpiresAt?.getTime() ?? 0, Date.now()) + minutes * 60_000),
  }));

export const releaseHold = (ref: string, by: string) =>
  decide(
    ref,
    "hold",
    "This hold has already ended",
    () => ({ status: "expired", decision: { action: "released", by, at: new Date().toISOString() } }),
    { title: "Hold released", body: `The hold on ${ref} was released, so the slot is free again.` },
    { name: "hold-ended", released: true },
  );

export async function addStaffMessage(ref: string, author: string, body: string): Promise<AdminResult> {
  return db.transaction(async (tx) => {
    const [b] = await tx
      .select({ kind: bookingTable.kind, customerId: bookingTable.customerId })
      .from(bookingTable)
      .where(eq(bookingTable.ref, ref));
    if (!b) return { ok: false, error: "Booking not found" };
    if (b.kind === "staff") return { ok: false, error: "Staff bookings don't have a payment thread" };
    await tx.insert(bookingMessage).values({ bookingRef: ref, from: "staff", author, body });
    await tx
      .insert(notification)
      .values({ customerId: b.customerId, bookingRef: ref, title: "New message about your booking", body });
    return { ok: true };
  });
}

/* ---------- Revenue ---------- */

/** Confirmed bookings starting between `from` and `to`: total, count, and paid (non-staff) total and count */
export async function revenueBetween(from: Date, to: Date) {
  const [row] = await db
    .select({
      total: sum(bookingTable.amount).mapWith(Number),
      count: count(),
      paidTotal:
        sql<number>`coalesce(sum(${bookingTable.amount}) filter (where ${bookingTable.kind} = 'user'), 0)`.mapWith(
          Number,
        ),
      paidCount: sql<number>`count(*) filter (where ${bookingTable.kind} = 'user')`.mapWith(Number),
    })
    .from(bookingTable)
    .where(and(eq(bookingTable.status, "confirmed"), gte(bookingTable.startsAt, from), lt(bookingTable.startsAt, to)));
  return {
    total: row?.total ?? 0,
    count: row?.count ?? 0,
    paidTotal: row?.paidTotal ?? 0,
    paidCount: row?.paidCount ?? 0,
  };
}

export async function revenueBySpace(from: Date, to: Date) {
  const rows = await db
    .select({ spaceId: bookingTable.spaceId, amount: sum(bookingTable.amount).mapWith(Number) })
    .from(bookingTable)
    .where(and(eq(bookingTable.status, "confirmed"), gte(bookingTable.startsAt, from), lt(bookingTable.startsAt, to)))
    .groupBy(bookingTable.spaceId);
  return new Map(rows.map((r) => [r.spaceId, r.amount ?? 0]));
}

/** Bookings confirmed (approved or automatically) since `since` */
export async function countConfirmedSince(since: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(bookingTable)
    .where(
      and(
        eq(bookingTable.status, "confirmed"),
        sql`(${bookingTable.decision}->>'at')::timestamptz >= ${since.toISOString()}`,
      ),
    );
  return row?.n ?? 0;
}
