// Booking platform data: customers and their sign-in records, spaces, services, add-ons, bookings and
// notifications. Everything lives in the "booking" Postgres schema with its own connection
// (BOOKING_DATABASE_POOLED_URL), so it can move to its own database whole. Apps use the functions in this package
// rather than querying these tables directly; customer sign-in itself is handled by packages/auth-customers,
// which is handed the customer tables below.
//
// Customers are separate from back-office staff, even for the same email address. Bookings link to their customer
// and also keep a copy of the contact details given for that booking.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import {
  BOOKING_STATUSES,
  type ClosedDate,
  type DayHours,
  type Decision,
  type Faq,
  type MessageId,
  type MessagePayload,
  type Photo,
  type PriceBreakdown,
  type Receipt,
} from "./types.ts";

export const booking = pgSchema("booking");

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const visibilityEnum = booking.enum("visibility", ["everyone", "staff"]);
export const bookingStatusEnum = booking.enum("booking_status", BOOKING_STATUSES);
export const bookingKindEnum = booking.enum("booking_kind", ["user", "staff"]);
export const channelEnum = booking.enum("channel", ["app", "phone", "walk-in"]);

/* ---------- Customers (sign-in records for the booking app) ---------- */

/** A booking-app account. Named "customer"; the sign-in library calls it "user". */
export const customer = booking.table("customer", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  ...timestamps,
});

export const customerSession = booking.table(
  "customer_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("customer_session_customer_idx").on(t.userId)],
);

/** Linked sign-in providers (Google) */
export const customerAccount = booking.table(
  "customer_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Required by the sign-in library's table layout, but always empty: password sign-in is never enabled */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("customer_account_customer_idx").on(t.userId)],
);

/** Short-lived values such as emailed sign-in codes */
export const customerVerification = booking.table(
  "customer_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("customer_verification_identifier_idx").on(t.identifier)],
);

/** Request counts for rate limiting (e.g. how many sign-in codes an address asked for) */
export const customerRateLimit = booking.table("customer_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  /** Milliseconds since 1970, which needs more than a 32-bit integer */
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ---------- Catalogue ---------- */

export const space = booking.table("space", {
  /** Readable id used in links, e.g. "creative-space" */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  capacity: integer("capacity").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("staff"),
  hours: jsonb("hours").$type<DayHours[]>().notNull(),
  closedDates: jsonb("closed_dates").$type<ClosedDate[]>().notNull().default([]),
  closedOnPublicHolidays: boolean("closed_on_public_holidays").notNull().default(true),
  photos: jsonb("photos").$type<Photo[]>().notNull().default([]),
  faqs: jsonb("faqs").$type<Faq[]>().notNull().default([]),
  minHours: integer("min_hours").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Longer bookings cost less per hour: from `hours` hours, `percent` off. One row per tier per space. */
export const lengthDiscount = booking.table(
  "length_discount",
  {
    id: serial("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    hours: integer("hours").notNull(),
    percent: integer("percent").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("length_discount_space_hours").on(t.spaceId, t.hours),
    check("length_discount_hours", sql`${t.hours} >= 1`),
    check("length_discount_percent", sql`${t.percent} between 1 and 90`),
  ],
);

export const service = booking.table(
  "service",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    hourlyRate: integer("hourly_rate").notNull(),
    photos: jsonb("photos").$type<Photo[]>().notNull().default([]),
    faqs: jsonb("faqs").$type<Faq[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("service_space_idx").on(t.spaceId)],
);

/**
 * "What's included": things that come with a space or service at no extra cost (e.g. a boom arm, Wi-Fi). One
 * shared list, so the same item can be attached to several spaces and services. Anything charged for is an
 * add-on instead.
 */
export const includedItem = booking.table("included_item", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  ...timestamps,
});

export const spaceIncludedItem = booking.table(
  "space_included_item",
  {
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => includedItem.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.spaceId, t.itemId] })],
);

export const serviceIncludedItem = booking.table(
  "service_included_item",
  {
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => includedItem.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.itemId] })],
);

export const addOn = booking.table(
  "add_on",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: integer("price").notNull(),
    /** How many exist; overlapping bookings share them */
    stock: integer("stock").notNull().default(1),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("add_on_space_idx").on(t.spaceId)],
);

/* ---------- Bookings ---------- */

// Double-booking is prevented by an exclusion constraint added in a hand-written migration (Drizzle can't
// describe one): no two active bookings (hold, pending, confirmed) of the same space may overlap.
export const bookingTable = booking.table(
  "booking",
  {
    /** "LS-2308-4821": day and month of the slot, then a random number */
    ref: text("ref").primaryKey(),
    /** A customer with bookings can't be deleted, so booking history is never orphaned */
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id),
    spaceId: text("space_id")
      .notNull()
      .references(() => space.id),
    serviceId: text("service_id").references(() => service.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatusEnum("status").notNull(),
    kind: bookingKindEnum("kind").notNull(),
    channel: channelEnum("channel").notNull().default("app"),
    /** Staff member who made the booking for the customer (phone or walk-in) */
    createdBy: text("created_by"),
    attendees: integer("attendees").notNull().default(1),
    attendeeNames: jsonb("attendee_names").$type<string[]>().notNull().default([]),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    purpose: text("purpose").notNull().default(""),
    price: jsonb("price").$type<PriceBreakdown>().notNull(),
    /** Same as price.total, kept as a column for revenue queries */
    amount: integer("amount").notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    receipt: jsonb("receipt").$type<Receipt | null>(),
    decision: jsonb("decision").$type<Decision | null>(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    ...timestamps,
  },
  (t) => [
    index("booking_customer_idx").on(t.customerId, t.startsAt),
    index("booking_space_time_idx").on(t.spaceId, t.startsAt),
    index("booking_status_idx").on(t.status),
    check("booking_time_order", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const bookingAddOn = booking.table(
  "booking_add_on",
  {
    bookingRef: text("booking_ref")
      .notNull()
      .references(() => bookingTable.ref, { onDelete: "cascade" }),
    addOnId: text("add_on_id")
      .notNull()
      .references(() => addOn.id),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingRef, t.addOnId] }), check("booking_add_on_quantity", sql`${t.quantity} > 0`)],
);

export const bookingMessage = booking.table(
  "booking_message",
  {
    id: serial("id").primaryKey(),
    bookingRef: text("booking_ref")
      .notNull()
      .references(() => bookingTable.ref, { onDelete: "cascade" }),
    from: text("from", { enum: ["staff", "customer"] }).notNull(),
    author: text("author").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_message_booking_idx").on(t.bookingRef)],
);

/* ---------- Customer notifications ---------- */

export const notification = booking.table(
  "notification",
  {
    id: serial("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    bookingRef: text("booking_ref").references(() => bookingTable.ref, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notification_customer_idx").on(t.customerId, t.createdAt)],
);

/** Which emails a customer wants. A missing row means the defaults (everything on). */
export const notificationSettings = booking.table("notification_settings", {
  customerId: text("customer_id")
    .primaryKey()
    .references(() => customer.id, { onDelete: "cascade" }),
  confirmations: boolean("confirmations").notNull().default(true),
  reminders: boolean("reminders").notNull().default(true),
  cancellations: boolean("cancellations").notNull().default(true),
  paymentUpdates: boolean("payment_updates").notNull().default(true),
  ...timestamps,
});

/* ---------- Outgoing emails and Slack posts ---------- */

/**
 * Messages waiting to be sent. Each is queued in the same transaction as the change it's about, so a booking
 * change and its messages are saved together or not at all; they're sent straight after, and retried later if
 * that fails (see outbox.ts).
 */
export const outbox = booking.table(
  "outbox",
  {
    id: serial("id").primaryKey(),
    /** Unique per message, so queuing the same one twice (a cron run that repeats) does nothing */
    key: text("key").notNull().unique(),
    message: text("message").$type<MessageId>().notNull(),
    payload: jsonb("payload").$type<MessagePayload>().notNull(),
    /** skipped: switched off, or no provider set up, by the time it was due */
    status: text("status", { enum: ["pending", "sent", "failed", "skipped"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set while one sender is working on it, so two can't send the same message */
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("outbox_due_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
    index("outbox_created_idx").on(t.createdAt),
  ],
);

/** Messages staff have switched on or off in the back office; a message with no row is on */
export const messageSetting = booking.table("message_setting", {
  id: text("id").$type<MessageId>().primaryKey(),
  enabled: boolean("enabled").notNull(),
  /** Staff email of whoever changed it last */
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
