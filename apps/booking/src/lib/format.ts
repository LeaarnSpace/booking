// Dates and money for booking screens. Bookings happen in Lagos, so times are always shown in Lagos time.
const TZ = "Africa/Lagos";

const nairaFormat = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const time12Format = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const shortDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TZ,
});
const longDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});
const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: TZ });
const relativeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** "₦18,000" */
export const naira = (amount: number) => nairaFormat.format(amount);

/** "09:00" */
export const formatTime = (date: Date) => timeFormat.format(date);

/** "9:00 AM" */
export const formatTime12 = (date: Date) => time12Format.format(date);

/** "09:00–11:00" */
export const formatTimeRange = (start: Date, end: Date) => `${formatTime(start)}–${formatTime(end)}`;

/** "Mon, 18 Aug" */
export const formatShortDay = (date: Date) => shortDayFormat.format(date);

/** "Saturday, 20 August" */
export const formatLongDay = (date: Date) => longDayFormat.format(date);

/** "July 2026" */
export const formatMonth = (date: Date) => monthFormat.format(date);

/** "20 Aug, 10:34" */
export const formatDateTime = (date: Date) => relativeFormat.format(date);

/** "IG" from "Ithime Gideon" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** "1 hr", "3 hrs" */
export const hoursLabel = (hours: number) => `${hours} hr${hours === 1 ? "" : "s"}`;
