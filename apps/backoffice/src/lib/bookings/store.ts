// Booking data for the back office, read from and written to the booking database (@learnspace/bookings),
// which also holds the customers. Pages call these functions only after checking the person's
// access; each change re-checks the booking's state, since someone else may have acted on it first.
import {
  admin,
  getCustomer as getCustomerAccount,
  getCustomers,
  listCustomers as listCustomerAccounts,
  type BookingRecord,
  type SpaceInput,
} from "@learnspace/bookings";
import { isAllowedEmail } from "@learnspace/auth-staff";
import { env } from "@/lib/env";
import { lagosMonthStart } from "./format";
import type {
  Booking,
  BookingStatus,
  BookingTab,
  BookingView,
  Customer,
  CustomerView,
  DeclineReason,
  Room,
  RoomPhoto,
} from "./types";

export type Result = { ok: true } | { ok: false; error: string };

const customerView = (c: Customer): CustomerView => ({
  ...c,
  isStaff: isAllowedEmail(c.email, env.booking.staffDomains),
});

function toBooking(
  r: BookingRecord & {
    messages?: { id: number; from: "staff" | "customer"; author: string; body: string; createdAt: Date }[];
  },
): Booking {
  const messages = (r.messages ?? []).map((m) => ({
    id: String(m.id),
    from: m.from,
    author: m.author,
    body: m.body,
    at: m.createdAt,
  }));
  // The receipt upload shows in the payment thread
  if (r.receipt) {
    messages.push({
      id: `receipt-${r.receipt.key}`,
      from: "customer",
      author: r.contactName,
      body: "Uploaded a payment receipt",
      attachment: r.receipt.fileName,
      at: new Date(r.receipt.uploadedAt),
    } as (typeof messages)[number]);
    messages.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  return {
    ref: r.ref,
    customerId: r.customerId,
    roomId: r.spaceId,
    serviceName: r.serviceName,
    start: r.startsAt,
    end: r.endsAt,
    status: r.status,
    kind: r.kind,
    amount: r.amount,
    createdAt: r.createdAt,
    holdExpiresAt: r.holdExpiresAt,
    receipt: r.receipt ? { ...r.receipt, uploadedAt: new Date(r.receipt.uploadedAt) } : null,
    messages,
    decision: r.decision ? { ...r.decision, at: new Date(r.decision.at) } : null,
  };
}

/** Adds the customer and room to each booking, reading each customer and room once */
async function views(
  records: (BookingRecord & { messages?: Parameters<typeof toBooking>[0]["messages"] })[],
): Promise<BookingView[]> {
  if (!records.length) return [];
  const [accounts, rooms] = await Promise.all([
    getCustomers([...new Set(records.map((r) => r.customerId))]),
    admin.listAllSpaces(),
  ]);
  const now = Date.now();
  return records.map((r) => {
    const account = accounts.find((c) => c.id === r.customerId);
    // The booking keeps the contact details it was made with, in case the account has gone
    const customer: Customer = account ?? {
      id: r.customerId,
      name: r.contactName,
      email: r.contactEmail,
      phone: r.contactPhone,
      createdAt: r.createdAt,
    };
    const holdLeftMs = r.status === "hold" && r.holdExpiresAt ? Math.max(0, r.holdExpiresAt.getTime() - now) : null;
    return {
      ...toBooking(r),
      customer: customerView({ ...customer, phone: customer.phone ?? r.contactPhone }),
      room: rooms.find((s) => s.id === r.spaceId)!,
      holdLeftMs,
      holdExpiring: holdLeftMs !== null && holdLeftMs <= env.booking.holdWarnMinutes * 60_000,
    };
  });
}

const TAB_STATUSES: Record<BookingTab, BookingStatus[] | null> = {
  pending: ["pending"],
  holds: ["hold"],
  confirmed: ["confirmed"],
  closed: ["declined", "cancelled", "expired"],
  all: null,
};

const byStart = (a: Booking, b: Booking) => a.start.getTime() - b.start.getTime();
const SORT: Record<BookingTab, (a: Booking, b: Booking) => number> = {
  // Oldest request first, so nobody waits longest
  pending: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  // Soonest to run out first
  holds: (a, b) => (a.holdExpiresAt?.getTime() ?? 0) - (b.holdExpiresAt?.getTime() ?? 0),
  confirmed: byStart,
  closed: (a, b) => byStart(b, a),
  all: (a, b) => byStart(b, a),
};

export async function listBookings(filter: { tab: BookingTab; roomId?: string; q?: string }) {
  const records = await admin.listBookingRecords({
    statuses: TAB_STATUSES[filter.tab],
    spaceId: filter.roomId,
    q: filter.q,
  });
  return (await views(records)).sort(SORT[filter.tab]);
}

export async function countBookingsByTab() {
  const counts = await admin.countByStatus();
  return Object.fromEntries(
    Object.entries(TAB_STATUSES).map(([tab, statuses]) => [
      tab,
      (statuses ?? (Object.keys(counts) as BookingStatus[])).reduce((n, s) => n + counts[s], 0),
    ]),
  ) as Record<BookingTab, number>;
}

/** Holds that run out within the warning window */
export async function listExpiringHolds() {
  return (await views(await admin.listBookingRecords({ statuses: ["hold"] }))).filter((b) => b.holdExpiring);
}

export async function getBooking(ref: string) {
  const record = await admin.getBookingRecord(ref);
  return record ? (await views([record]))[0] : null;
}

export async function listRooms(): Promise<Room[]> {
  return admin.listAllSpaces();
}

export async function listCustomers(q?: string) {
  const [accounts, counts] = await Promise.all([listCustomerAccounts(q), admin.bookingCountsByCustomer()]);
  return accounts.map((c) => ({ ...customerView(c), bookingCount: counts.get(c.id) ?? 0 }));
}

export async function getCustomer(id: string) {
  const account = await getCustomerAccount(id);
  if (!account) return null;
  const bookings = (await views(await admin.listBookingRecords({ customerId: id }))).sort((a, b) => byStart(b, a));
  return { ...customerView(account), bookings };
}

/** Money and counts for one Lagos calendar month */
export async function revenueSummary(now = new Date()) {
  const monthStart = lagosMonthStart(now);
  const nextMonth = lagosMonthStart(now, 1);
  const lastMonth = lagosMonthStart(now, -1);
  const [thisMonth, previous, bySpace, rooms, confirmedThisWeek, counts, payments] = await Promise.all([
    admin.revenueBetween(monthStart, nextMonth),
    admin.revenueBetween(lastMonth, monthStart),
    admin.revenueBySpace(monthStart, nextMonth),
    admin.listAllSpaces(),
    admin.countConfirmedSince(new Date(now.getTime() - 7 * 24 * 60 * 60_000)),
    admin.countByStatus(),
    admin.listBookingRecords({ statuses: ["confirmed"], from: monthStart, to: nextMonth }),
  ]);
  return {
    monthStart,
    revenue: thisMonth.total,
    revenueLastMonth: previous.total,
    confirmed: thisMonth.count,
    confirmedThisWeek,
    pendingReview: counts.pending,
    averagePaid: thisMonth.paidCount ? Math.round(thisMonth.paidTotal / thisMonth.paidCount) : 0,
    averagePaidLastMonth: previous.paidCount ? Math.round(previous.paidTotal / previous.paidCount) : 0,
    byRoom: rooms.map((room) => ({ room, amount: bySpace.get(room.id) ?? 0 })),
    payments: (await views(payments.filter((p) => p.startsAt >= monthStart))).sort((a, b) => byStart(b, a)),
  };
}

// Changes

export const approveBooking = (ref: string, by: string): Promise<Result> => admin.approveBooking(ref, by);

export const declineBooking = (
  ref: string,
  by: string,
  reason: DeclineReason,
  note: string | undefined,
): Promise<Result> => admin.declineBooking(ref, by, reason, note);

export const extendHold = (ref: string, minutes: number): Promise<Result> => admin.extendHold(ref, minutes);

export const releaseHold = (ref: string, by: string): Promise<Result> => admin.releaseHold(ref, by);

export const addStaffMessage = (ref: string, author: string, body: string): Promise<Result> =>
  admin.addStaffMessage(ref, author, body);

export const setRoomVisibility = (roomId: string, visibility: Room["visibility"]): Promise<Result> =>
  admin.updateSpace(roomId, { visibility });

export const getRoom = (id: string) => admin.getSpaceRecord(id);

export type RoomInput = SpaceInput;

export const createRoom = (input: RoomInput) => admin.createSpace(input);

export const updateRoom = (id: string, input: RoomInput): Promise<Result> => admin.updateSpace(id, input);

export const MAX_ROOM_PHOTOS = admin.MAX_PHOTOS;

export const addRoomPhoto = (id: string, photo: RoomPhoto): Promise<Result> => admin.addSpacePhoto(id, photo);

/** Takes the photo off the room. The caller deletes the file from storage. */
export const removeRoomPhoto = (id: string, key: string): Promise<Result> => admin.removeSpacePhoto(id, key);

export const makeCoverPhoto = (id: string, key: string): Promise<Result> => admin.makeSpaceCover(id, key);

/** Bookings that hold or use a slot between `from` and `to` (declined, cancelled and expired ones left out) */
export async function listScheduledBookings(from: Date, to: Date) {
  const records = await admin.listBookingRecords({ statuses: ["hold", "pending", "confirmed"], from, to });
  return (await views(records)).sort(byStart);
}
