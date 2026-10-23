"use server";
// Changes from the pricing tables: hourly rates, services, add-ons and length discounts. Each re-checks that
// the caller can edit Bookings. The booking app reads these on every page, so changes show there at once;
// bookings already made keep the price they were made at.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin } from "@learnspace/bookings";
import type { Result } from "@/lib/bookings/store";
import { requireSection } from "@/lib/viewer";

const naira = z.coerce.number().int("Use whole naira").min(0, "Prices can't be negative").max(10_000_000);
const name = z.string().trim().min(2, "Give it a name").max(60);
const id = z.string().min(1);

function done(result: Result): Result {
  if (result.ok) revalidatePath("/bookings", "layout");
  return result;
}

const firstError = (e: z.ZodError) => ({ ok: false as const, error: e.issues[0].message });

export async function saveSpaceRate(spaceId: string, _: Result | null, form: FormData): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = naira.safeParse(form.get("hourlyRate"));
  if (!parsed.success) return firstError(parsed.error);
  return done(await admin.setSpaceRate(spaceId, parsed.data));
}

const serviceInput = z.object({ spaceId: id, name, hourlyRate: naira, active: z.boolean() });

export async function saveService(serviceId: string | null, _: Result | null, form: FormData): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = serviceInput.safeParse({
    spaceId: form.get("spaceId"),
    name: form.get("name"),
    hourlyRate: form.get("hourlyRate"),
    active: serviceId ? form.get("active") === "on" : true,
  });
  if (!parsed.success) return firstError(parsed.error);
  return done(await admin.saveService(serviceId, parsed.data));
}

const addOnInput = z.object({
  spaceId: id,
  name,
  description: z.string().trim().max(80, "Keep the description short"),
  price: naira,
  stock: z.coerce.number().int().min(0, "Stock can't be negative").max(100),
  active: z.boolean(),
});

export async function saveAddOn(addOnId: string | null, _: Result | null, form: FormData): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = addOnInput.safeParse({
    spaceId: form.get("spaceId"),
    name: form.get("name"),
    description: form.get("description") ?? "",
    price: form.get("price"),
    stock: form.get("stock"),
    active: addOnId ? form.get("active") === "on" : true,
  });
  if (!parsed.success) return firstError(parsed.error);
  return done(await admin.saveAddOn(addOnId, parsed.data));
}

const discountInput = z.object({
  spaceId: id,
  hours: z.coerce.number().int("Use whole hours").min(2, "Discounts start from 2 hours").max(24),
  percent: z.coerce.number().int("Use a whole percentage").min(1, "At least 1% off").max(90, "At most 90% off"),
});

export async function saveDiscount(discountId: number | null, _: Result | null, form: FormData): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = discountInput.safeParse({
    spaceId: form.get("spaceId"),
    hours: form.get("hours"),
    percent: form.get("percent"),
  });
  if (!parsed.success) return firstError(parsed.error);
  return done(await admin.saveDiscount(discountId, parsed.data));
}

export async function deleteDiscount(discountId: number): Promise<Result> {
  await requireSection("bookings", "editor");
  return done(await admin.deleteDiscount(discountId));
}
