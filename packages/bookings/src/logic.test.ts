import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canBook, closedReason, daySlots, maxHoursFrom } from "./availability.ts";
import { discountFor, priceBooking } from "./pricing.ts";
import { addDays, lagosIsoDate, lagosTime, nigerianHolidays, weekdayIndex } from "./time.ts";
import type { DayHours } from "./types.ts";

const weekdays: DayHours = { open: "09:00", close: "17:00" };
const space = {
  hours: [weekdays, weekdays, weekdays, weekdays, weekdays, { open: "10:00", close: "14:00" }, null],
  closedDates: [{ date: "2026-08-27", label: "Maintenance" }],
  closedOnPublicHolidays: true,
};
// Thursday 20 August 2026
const day = "2026-08-20";
const at = (time: string, date = day) => lagosTime(date, time);
const before = at("00:00");

describe("time", () => {
  it("works in Lagos time (UTC+1)", () => {
    assert.equal(at("09:00").toISOString(), "2026-08-20T08:00:00.000Z");
    assert.equal(lagosIsoDate(new Date("2026-08-20T23:30:00Z")), "2026-08-21");
    assert.equal(weekdayIndex(day), 3);
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });

  it("knows Easter-based holidays", () => {
    const h = nigerianHolidays(2026);
    // Easter Sunday 2026 is 5 April
    assert.equal(h["2026-04-03"], "Good Friday");
    assert.equal(h["2026-04-06"], "Easter Monday");
    assert.equal(h["2026-10-01"], "Independence Day");
  });
});

describe("availability", () => {
  it("explains closed days", () => {
    assert.equal(closedReason(space, "2026-08-23"), "Closed on Sundays");
    assert.equal(closedReason(space, "2026-08-27"), "Maintenance");
    assert.equal(closedReason(space, "2026-10-01"), "Independence Day");
    assert.equal(closedReason({ ...space, closedOnPublicHolidays: false }, "2026-10-01"), null);
    assert.equal(closedReason(space, day), null);
  });

  it("offers hourly slots and marks taken and past ones", () => {
    const busy = [{ start: at("12:00"), end: at("13:30") }];
    const slots = daySlots(space, day, busy, at("10:15"));
    assert.deepEqual(
      slots.map((s) => `${s.time} ${s.state}`),
      [
        "09:00 past",
        "10:00 past",
        "11:00 free",
        "12:00 taken",
        "13:00 taken",
        "14:00 free",
        "15:00 free",
        "16:00 free",
      ],
    );
    assert.deepEqual(daySlots(space, "2026-08-23", [], before), []);
  });

  it("limits length by closing time and the next booking", () => {
    const busy = [{ start: at("12:00"), end: at("13:00") }];
    assert.equal(maxHoursFrom(space, at("09:00"), busy), 3);
    assert.equal(maxHoursFrom(space, at("13:00"), busy), 4);
    assert.equal(maxHoursFrom(space, at("12:00"), busy), 0);
    assert.equal(maxHoursFrom(space, at("08:00"), []), 0);
    assert.equal(maxHoursFrom(space, at("10:00", "2026-08-22"), []), 4);
  });

  it("checks a whole booking", () => {
    const busy = [{ start: at("12:00"), end: at("13:00") }];
    assert.equal(canBook(space, at("09:00"), 3, busy, before), true);
    assert.equal(canBook(space, at("09:00"), 4, busy, before), false);
    assert.equal(canBook(space, at("09:00"), 1, [], at("09:30")), false);
    assert.equal(canBook(space, at("09:00"), 1.5, [], before), false);
  });
});

describe("pricing", () => {
  const discounts = [
    { hours: 3, percent: 5 },
    { hours: 5, percent: 10 },
    { hours: 8, percent: 15 },
  ];
  const camera = { id: "camera", name: "Extra camera", price: 5_500 };

  it("picks the biggest discount reached", () => {
    assert.equal(discountFor(2, discounts), 0);
    assert.equal(discountFor(4, discounts), 5);
    assert.equal(discountFor(8, discounts), 15);
  });

  it("adds up rate, discount and add-ons", () => {
    const price = priceBooking({ hourlyRate: 25_000, hours: 3, discounts, addOns: [{ addOn: camera, quantity: 2 }] });
    assert.equal(price.base, 75_000);
    assert.equal(price.discount, 3_750);
    assert.equal(price.addOnsTotal, 11_000);
    assert.equal(price.total, 82_250);
  });

  it("charges staff nothing but keeps the details", () => {
    const price = priceBooking({
      hourlyRate: 25_000,
      hours: 2,
      discounts,
      addOns: [{ addOn: camera, quantity: 1 }],
      free: true,
    });
    assert.equal(price.total, 0);
    assert.equal(price.addOns[0].name, "Extra camera");
  });
});
