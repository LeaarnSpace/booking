// Dates and money for booking screens. Bookings happen in Lagos, so times are always shown in Lagos time.
const TZ = "Africa/Lagos";
/** West Africa Time is UTC+1 all year (no daylight saving) */
export const LAGOS_OFFSET_MS = 60 * 60 * 1000;

const nairaFormat = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: TZ });

export const naira = (amount: number) => nairaFormat.format(amount);

/** "Fri, 5 Sep · 09:00–10:00" */
export const formatSlot = (start: Date, end: Date) =>
  `${dayFormat.format(start)} · ${timeFormat.format(start)}–${timeFormat.format(end)}`;

/** "5 Sep 2026" */
export const formatDate = (date: Date) => dateFormat.format(date);

/** "6 Sep, 11:00" */
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

/** "October 2026" */
export const formatMonth = (date: Date) => monthFormat.format(date);

/** "14 min", "3 h 20 min", "2 days" */
export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) return totalMinutes % 60 ? `${hours} h ${totalMinutes % 60} min` : `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Start of the Lagos calendar month that `date` falls in, `offset` months later */
export function lagosMonthStart(date: Date, offset = 0) {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth() + offset, 1) - LAGOS_OFFSET_MS);
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Mon–Fri 08:00–20:00 · Sat 10:00–16:00", or "Closed every day" */
export function formatWeeklyHours(hours: ({ open: string; close: string } | null)[]) {
  const groups: { from: number; to: number; label: string }[] = [];
  hours.forEach((h, day) => {
    if (!h) return;
    const label = `${h.open}–${h.close}`;
    const last = groups.at(-1);
    if (last && last.label === label && last.to === day - 1) last.to = day;
    else groups.push({ from: day, to: day, label });
  });
  if (!groups.length) return "Closed every day";
  if (groups.length === 1 && groups[0].from === 0 && groups[0].to === 6) return `Every day ${groups[0].label}`;
  return groups
    .map(({ from, to, label }) => {
      const days = from === to ? WEEKDAY_NAMES[from] : `${WEEKDAY_NAMES[from]}–${WEEKDAY_NAMES[to]}`;
      return `${days} ${label}`;
    })
    .join(" · ");
}

/** "25 Dec 2026" from "2026-12-25" */
export const formatIsoDate = (iso: string) => formatDate(new Date(`${iso}T12:00:00+01:00`));

/** Monday 00:00 (Lagos) of the week `date` falls in, `offset` weeks later */
export function lagosWeekStart(date: Date, offset = 0) {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const mondayOffset = (lagos.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() - mondayOffset + offset * 7) -
      LAGOS_OFFSET_MS,
  );
}

/** "2026-10-19" in Lagos time */
export const lagosIsoDate = (date: Date) => new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);

/** "09:00" in Lagos time */
export const formatTime = (date: Date) => timeFormat.format(date);
