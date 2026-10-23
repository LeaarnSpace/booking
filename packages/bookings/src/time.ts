// Lagos calendar helpers. Bookings happen in Lagos, which is UTC+1 all year (no daylight saving), so a
// fixed offset is exact. Calendar days are passed around as "2026-08-20" strings.

export const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-08-20" for the Lagos day `date` falls on */
export const lagosIsoDate = (date: Date) => new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);

/** The moment a Lagos wall-clock time happens, e.g. at("2026-08-20", "09:00") */
export const lagosTime = (isoDate: string, time = "00:00") => new Date(`${isoDate}T${time}:00+01:00`);

/** Minutes after Lagos midnight */
export const lagosMinutes = (date: Date) => {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return lagos.getUTCHours() * 60 + lagos.getUTCMinutes();
};

/** "09:00" → 540 */
export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** 540 → "09:00" */
export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** 0 = Monday … 6 = Sunday */
export const weekdayIndex = (isoDate: string) => (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;

export const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Easter Sunday (Gregorian), as "YYYY-MM-DD" */
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Nigerian public holidays that can be worked out in advance. Eid and other lunar holidays move each year
 * and are announced late, so staff add those as closed dates on each space.
 */
export function nigerianHolidays(year: number): Record<string, string> {
  const easter = easterSunday(year);
  return {
    [`${year}-01-01`]: "New Year's Day",
    [addDays(easter, -2)]: "Good Friday",
    [addDays(easter, 1)]: "Easter Monday",
    [`${year}-05-01`]: "Workers' Day",
    [`${year}-06-12`]: "Democracy Day",
    [`${year}-10-01`]: "Independence Day",
    [`${year}-12-25`]: "Christmas Day",
    [`${year}-12-26`]: "Boxing Day",
  };
}
