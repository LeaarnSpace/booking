// Which start times can be booked on a given day. A space takes one booking at a time, whatever the
// service, so anything active in the space blocks the slot. Slots start on the hour, inside opening hours.
import {
  fromMinutes,
  lagosIsoDate,
  lagosMinutes,
  lagosTime,
  nigerianHolidays,
  toMinutes,
  weekdayIndex,
} from "./time.ts";
import type { Space } from "./types.ts";

export interface Interval {
  start: Date;
  end: Date;
}

export type SlotState = "free" | "taken" | "past";

export interface Slot {
  /** "09:00" */
  time: string;
  start: Date;
  state: SlotState;
}

export type OpeningRules = Pick<Space, "hours" | "closedDates" | "closedOnPublicHolidays">;

const DAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** Why the space is closed on that day, or null if it's open */
export function closedReason(space: OpeningRules, isoDate: string): string | null {
  const closed = space.closedDates.find((d) => d.date === isoDate);
  if (closed) return closed.label || "Closed";
  if (space.closedOnPublicHolidays) {
    const holiday = nigerianHolidays(Number(isoDate.slice(0, 4)))[isoDate];
    if (holiday) return holiday;
  }
  const day = weekdayIndex(isoDate);
  return space.hours[day] ? null : `Closed on ${DAY_NAMES[day]}`;
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;
const HOUR_MS = 60 * 60_000;

/** Hourly start times for the day, each free, taken or already past */
export function daySlots(space: OpeningRules, isoDate: string, busy: Interval[], now: Date): Slot[] {
  if (closedReason(space, isoDate)) return [];
  const hours = space.hours[weekdayIndex(isoDate)]!;
  const slots: Slot[] = [];
  // Every whole hour that leaves room for a one-hour booking before closing
  for (let m = Math.ceil(toMinutes(hours.open) / 60) * 60; m + 60 <= toMinutes(hours.close); m += 60) {
    const time = fromMinutes(m);
    const start = lagosTime(isoDate, time);
    const hour = { start, end: new Date(start.getTime() + HOUR_MS) };
    const state: SlotState = start <= now ? "past" : busy.some((b) => overlaps(b, hour)) ? "taken" : "free";
    slots.push({ time, start, state });
  }
  return slots;
}

/** Longest booking, in whole hours, that can start at `start` before closing time or the next booking */
export function maxHoursFrom(space: OpeningRules, start: Date, busy: Interval[]): number {
  const isoDate = lagosIsoDate(start);
  if (closedReason(space, isoDate)) return 0;
  const hours = space.hours[weekdayIndex(isoDate)]!;
  const startMinutes = lagosMinutes(start);
  if (startMinutes < toMinutes(hours.open)) return 0;
  let limit = toMinutes(hours.close) - startMinutes;
  for (const b of busy) {
    if (b.end <= start) continue;
    if (b.start <= start) return 0;
    limit = Math.min(limit, (b.start.getTime() - start.getTime()) / 60_000);
  }
  return Math.max(0, Math.floor(limit / 60));
}

/** Whether [start, start + hours) is in the future, inside opening hours and clear of `busy` */
export function canBook(space: OpeningRules, start: Date, hours: number, busy: Interval[], now: Date) {
  return start > now && Number.isInteger(hours) && hours >= 1 && maxHoursFrom(space, start, busy) >= hours;
}
