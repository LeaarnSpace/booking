// Dates for the Schedule page and the booking form.
import { addDays, isIsoDate, lagosIsoDate, weekdayIndex } from "@learnspace/bookings/client";

/** The date asked for in the URL, or today (Lagos) */
export const pickDate = (value: string | undefined) => {
  const today = lagosIsoDate(new Date());
  return value && isIsoDate(value) && value >= today ? value : today;
};

/** Monday of the week `date` is in */
export const weekStart = (date: string) => addDays(date, -weekdayIndex(date));
