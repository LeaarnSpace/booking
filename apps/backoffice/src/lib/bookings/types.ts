// Shapes of booking-platform data as the back office sees it. Amounts are whole naira. The data itself, customers
// included, lives in the booking database (@learnspace/bookings).
import type { BookingStatus, DeclineReason, Photo, SpaceRecord } from "@learnspace/bookings";

export {
  DECLINE_REASONS,
  MAX_PHOTO_BYTES,
  MIN_PHOTO_SIZE,
  PHOTO_SIZE,
  PHOTO_TYPES,
  RECEIPT_TYPES,
  WEEKDAYS,
  type BookingStatus,
  type ClosedDate,
  type DayHours,
  type DeclineReason,
} from "@learnspace/bookings/client";

/** A bookable space (the back office calls them rooms) */
export type Room = SpaceRecord;
export type RoomPhoto = Photo;

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  from: "staff" | "customer";
  author: string;
  body: string;
  /** Set when the customer uploaded a receipt */
  attachment?: string;
  at: Date;
}

export interface Decision {
  action: "approved" | "declined" | "released" | "auto";
  by: string;
  at: Date;
  reason?: DeclineReason;
  note?: string;
}

export interface Booking {
  ref: string;
  customerId: string;
  roomId: string;
  /** The service booked, when the space has services (e.g. Video Podcast) */
  serviceName: string | null;
  start: Date;
  end: Date;
  status: BookingStatus;
  /** Decided when the booking is made: staff bookings are free and skip review */
  kind: "user" | "staff";
  amount: number;
  createdAt: Date;
  holdExpiresAt: Date | null;
  /** Stored in the private receipts bucket */
  receipt: { key: string; fileName: string; contentType: string; uploadedAt: Date } | null;
  messages: Message[];
  decision: Decision | null;
}

export const BOOKING_TABS = [
  { id: "pending", label: "Needs review" },
  { id: "holds", label: "Holds" },
  { id: "confirmed", label: "Confirmed" },
  { id: "closed", label: "Declined & expired" },
  { id: "all", label: "All" },
] as const;

export type BookingTab = (typeof BOOKING_TABS)[number]["id"];

export interface CustomerView extends Customer {
  /** Worked out from the email domain each time, so changing the staff domains takes effect at once */
  isStaff: boolean;
}

export interface BookingView extends Booking {
  customer: CustomerView;
  room: Room;
  /** For holds: time left when the booking was read, and whether that's inside the warning window */
  holdLeftMs: number | null;
  holdExpiring: boolean;
}
