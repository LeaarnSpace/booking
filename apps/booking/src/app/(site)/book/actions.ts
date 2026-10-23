"use server";
// The booking form's server side: free slots for a day, add-on stock for a time, and making the booking.
// Everything is checked again inside createBooking, so these answers only guide the form.
import { redirect } from "next/navigation";
import { z } from "zod";
import { addOnsLeft, busyIntervals, createBooking, getSpace, updateCustomer } from "@learnspace/bookings";
import { addDays, closedReason, daySlots, isIsoDate, lagosTime, maxHoursFrom } from "@learnspace/bookings/client";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

export interface DayAvailability {
  closed: string | null;
  slots: { time: string; start: string; state: "free" | "taken" | "past"; maxHours: number }[];
}

export async function getDayAvailability(spaceId: string, date: string): Promise<DayAvailability> {
  const viewer = await getViewer();
  const space = await getSpace(spaceId, { isStaff: viewer?.isStaff ?? false });
  if (!space || !isIsoDate(date)) return { closed: "Not available", slots: [] };
  const closed = closedReason(space, date);
  if (closed) return { closed, slots: [] };
  const busy = await busyIntervals(space.id, lagosTime(date), lagosTime(addDays(date, 1)));
  return {
    closed: null,
    slots: daySlots(space, date, busy, new Date()).map((s) => ({
      time: s.time,
      start: s.start.toISOString(),
      state: s.state,
      maxHours: s.state === "free" ? maxHoursFrom(space, s.start, busy) : 0,
    })),
  };
}

export async function getAddOnsLeft(spaceId: string, start: string, hours: number) {
  const begin = new Date(start);
  if (Number.isNaN(begin.getTime()) || !Number.isInteger(hours) || hours < 1 || hours > 24) return {};
  const items = await addOnsLeft(spaceId, begin, new Date(begin.getTime() + hours * 60 * 60_000));
  return Object.fromEntries(items.map((a) => [a.id, a.left])) as Record<string, number>;
}

const bookingInput = z.object({
  spaceId: z.string().min(1),
  serviceId: z.string().min(1).nullable(),
  start: z.iso.datetime(),
  hours: z.number().int().min(1, "Choose how long you need").max(24),
  attendeeNames: z.array(z.string().trim().max(80)).max(500),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || /^\+?[\d\s()-]{7,}$/.test(v), "Enter a valid phone number"),
  purpose: z
    .string()
    .trim()
    .min(3, "Tell us what the booking is for")
    .max(1000, "Keep the purpose under 1,000 characters"),
  addOns: z.array(z.object({ id: z.string(), quantity: z.number().int().min(0).max(50) })).max(20),
});

export type BookingInput = z.input<typeof bookingInput>;

export async function submitBooking(input: BookingInput): Promise<{ error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please log in again to book." };
  const parsed = bookingInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const names = data.attendeeNames.filter(Boolean);

  const result = await createBooking({
    customer: { id: viewer.id, name: viewer.name, email: viewer.email, isStaff: viewer.isStaff },
    spaceId: data.spaceId,
    serviceId: data.serviceId,
    start: new Date(data.start),
    hours: data.hours,
    attendees: Math.max(1, data.attendeeNames.length),
    attendeeNames: names,
    contactPhone: data.phone || null,
    purpose: data.purpose,
    addOns: data.addOns,
    holdMinutes: env.holdMinutes,
  });
  if (!result.ok) return { error: result.error };
  // Remember the phone number for next time
  if (data.phone && data.phone !== viewer.phone) await updateCustomer(viewer.id, { phone: data.phone });
  redirect(result.status === "hold" ? `/bookings/${result.ref}/pay` : `/bookings/${result.ref}?done=confirmed`);
}
