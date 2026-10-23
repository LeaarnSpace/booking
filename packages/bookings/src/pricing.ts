// Booking prices: hourly rate × hours, less the best length discount, plus add-ons. Staff bookings are free.
import type { AddOn, LengthDiscount, PriceBreakdown } from "./types.ts";

/** The discount for a booking of `hours` hours: the biggest tier it reaches, or 0 */
export function discountFor(hours: number, discounts: LengthDiscount[]) {
  return discounts.filter((d) => hours >= d.hours).reduce((best, d) => Math.max(best, d.percent), 0);
}

export function priceBooking(input: {
  hourlyRate: number;
  hours: number;
  discounts: LengthDiscount[];
  addOns: { addOn: Pick<AddOn, "id" | "name" | "price">; quantity: number }[];
  /** Staff bookings: everything is listed, but nothing is charged */
  free?: boolean;
}): PriceBreakdown {
  const rate = input.free ? 0 : input.hourlyRate;
  const base = rate * input.hours;
  const discountPercent = input.free ? 0 : discountFor(input.hours, input.discounts);
  // Round to whole naira, in the customer's favour
  const discount = Math.ceil((base * discountPercent) / 100);
  const addOns = input.addOns
    .filter((a) => a.quantity > 0)
    .map(({ addOn, quantity }) => {
      const unitPrice = input.free ? 0 : addOn.price;
      return { addOnId: addOn.id, name: addOn.name, quantity, unitPrice, total: unitPrice * quantity };
    });
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.total, 0);
  return {
    hourlyRate: rate,
    hours: input.hours,
    base,
    discountPercent,
    discount,
    addOns,
    addOnsTotal,
    total: base - discount + addOnsTotal,
  };
}
