// Shapes shared by the booking app and the back office. Amounts are whole naira; times are Lagos time.

/**
 * hold: slot requested, waiting for the customer's payment receipt (released when the hold runs out)
 * pending: receipt uploaded, waiting for staff review (the slot stays reserved meanwhile)
 * confirmed: approved, or a staff booking (free, confirmed straight away)
 * declined: staff rejected the receipt
 * cancelled: the customer cancelled
 * expired: the hold ran out or staff released it
 */
export const BOOKING_STATUSES = ["hold", "pending", "confirmed", "declined", "cancelled", "expired"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** These statuses keep the slot: Postgres refuses a second booking that overlaps one of them */
export const ACTIVE_STATUSES = ["hold", "pending", "confirmed"] as const satisfies readonly BookingStatus[];

/** Opening and closing time ("08:00", "20:00", Lagos time), or null when closed that day */
export type DayHours = { open: string; close: string } | null;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface ClosedDate {
  /** "2026-12-25" */
  date: string;
  label: string;
}

export interface Photo {
  /** Object key in media storage */
  key: string;
  alt: string;
}

export interface Faq {
  question: string;
  answer: string;
}

/** Longer bookings cost less per hour: from `hours` hours, take `percent` off */
export interface LengthDiscount {
  hours: number;
  percent: number;
}

/** Who can see and book a space or service. Staff-only spaces are hidden from customers. */
export type Visibility = "everyone" | "staff";

export interface Space {
  id: string;
  name: string;
  /** One line for cards */
  tagline: string;
  description: string;
  capacity: number;
  /** Used when the space has no services; otherwise each service has its own rate */
  hourlyRate: number;
  visibility: Visibility;
  /** Monday first; slots are offered inside these hours */
  hours: DayHours[];
  closedDates: ClosedDate[];
  closedOnPublicHolidays: boolean;
  /** "What's included" (free); anything charged for is an add-on */
  included: string[];
  /** The first photo is the cover */
  photos: Photo[];
  faqs: Faq[];
  discounts: LengthDiscount[];
  /** Shortest booking, in hours */
  minHours: number;
  sortOrder: number;
}

/** Something you can book a space for, with its own rate (e.g. Video Podcast in the Creative Space) */
export interface Service {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  hourlyRate: number;
  /** "What's included" (free); anything charged for is an add-on */
  included: string[];
  /** The first photo is the cover */
  photos: Photo[];
  faqs: Faq[];
  active: boolean;
  sortOrder: number;
}

/** Extra equipment, priced per item for the whole booking. `stock` is shared by overlapping bookings. */
export interface AddOn {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  sortOrder: number;
}

export interface Receipt {
  /** Object key in the private receipts bucket */
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export const RECEIPT_TYPES = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
} as const;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Every space and service photo is stored at this size (16:9), cropped from the centre when uploaded */
export const PHOTO_SIZE = { width: 1920, height: 1080 } as const;
/** Smaller photos would look blurry on large screens, so they're refused */
export const MIN_PHOTO_SIZE = { width: 1280, height: 720 } as const;

export const DECLINE_REASONS = [
  { id: "unclear", label: "Receipt image is unclear" },
  { id: "amount", label: "Amount doesn't match the booking" },
  { id: "not-received", label: "Payment not received" },
  { id: "duplicate", label: "Suspected duplicate booking" },
  { id: "fraud", label: "Suspected fraud" },
  { id: "other", label: "Other" },
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number]["id"];

export interface Decision {
  action: "approved" | "declined" | "released" | "auto";
  by: string;
  at: string;
  reason?: DeclineReason;
  note?: string;
}

export const CANCEL_REASONS = [
  "I no longer need the space",
  "I made the booking by accident",
  "My schedule changed",
  "I found a different venue",
  "The pricing doesn't work for me",
  "Other",
] as const;

/** Where a booking came from: the booking app, or staff booking for someone by phone or in person */
export type Channel = "app" | "phone" | "walk-in";

/** Price worked out when the booking is made, and kept with it so later price changes don't alter it */
export interface PriceBreakdown {
  hourlyRate: number;
  hours: number;
  /** Rate × hours */
  base: number;
  discountPercent: number;
  discount: number;
  addOns: { addOnId: string; name: string; quantity: number; unitPrice: number; total: number }[];
  addOnsTotal: number;
  total: number;
}

/** Emails a customer can turn off (sign-in codes always go) */
export const NOTIFICATION_SETTINGS = [
  { id: "confirmations", label: "Booking confirmations" },
  { id: "reminders", label: "Booking reminders" },
  { id: "cancellations", label: "Cancellations" },
  { id: "paymentUpdates", label: "Payment updates" },
] as const;
export type NotificationSetting = (typeof NOTIFICATION_SETTINGS)[number]["id"];
