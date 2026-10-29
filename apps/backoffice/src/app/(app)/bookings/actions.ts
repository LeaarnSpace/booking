"use server";
// Booking decisions. Every action re-checks that the caller is at least an editor of the Bookings section.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogChanged, messagesQueued } from "@/lib/booking-app";
import * as store from "@/lib/bookings/store";
import { DECLINE_REASONS, type DeclineReason } from "@/lib/bookings/types";
import { env } from "@/lib/env";
import { requireSection } from "@/lib/viewer";

type Result = store.Result;

const ref = z.string().regex(/^LS-\d{4}-\d+$/);

function done(bookingRef: string, outcome: string): never {
  revalidatePath("/bookings", "layout");
  redirect(`/bookings/${bookingRef}?done=${outcome}`);
}

export async function approveBooking(bookingRef: string): Promise<Result> {
  const me = await requireSection("bookings", "editor");
  if (!ref.safeParse(bookingRef).success) return { ok: false, error: "Unknown booking" };
  const result = await store.approveBooking(bookingRef, me.name);
  if (!result.ok) return result;
  messagesQueued();
  done(bookingRef, "approved");
}

const declineForm = z
  .object({
    reason: z.enum(DECLINE_REASONS.map((r) => r.id) as [DeclineReason, ...DeclineReason[]], {
      error: "Choose a reason",
    }),
    note: z.string().trim().max(1000, "Keep the message under 1,000 characters").optional(),
  })
  .refine((f) => f.reason !== "other" || f.note, { message: "Tell the customer why", path: ["note"] });

export async function declineBooking(bookingRef: string, _: Result | null, form: FormData): Promise<Result> {
  const me = await requireSection("bookings", "editor");
  if (!ref.safeParse(bookingRef).success) return { ok: false, error: "Unknown booking" };
  const parsed = declineForm.safeParse({
    reason: form.get("reason") ?? undefined,
    note: (form.get("note") as string | null) || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const result = await store.declineBooking(bookingRef, me.name, parsed.data.reason, parsed.data.note);
  if (!result.ok) return result;
  messagesQueued();
  done(bookingRef, "declined");
}

export async function extendHold(bookingRef: string): Promise<Result> {
  await requireSection("bookings", "editor");
  if (!ref.safeParse(bookingRef).success) return { ok: false, error: "Unknown booking" };
  const result = await store.extendHold(bookingRef, env.booking.holdExtendMinutes);
  if (!result.ok) return result;
  done(bookingRef, "extended");
}

export async function releaseHold(bookingRef: string): Promise<Result> {
  const me = await requireSection("bookings", "editor");
  if (!ref.safeParse(bookingRef).success) return { ok: false, error: "Unknown booking" };
  const result = await store.releaseHold(bookingRef, me.name);
  if (!result.ok) return result;
  messagesQueued();
  done(bookingRef, "released");
}

export async function sendMessage(bookingRef: string, _: Result | null, form: FormData): Promise<Result> {
  const me = await requireSection("bookings", "editor");
  if (!ref.safeParse(bookingRef).success) return { ok: false, error: "Unknown booking" };
  const body = z.string().trim().min(1, "Write a message first").max(2000).safeParse(form.get("body"));
  if (!body.success) return { ok: false, error: body.error.issues[0].message };
  const result = await store.addStaffMessage(bookingRef, me.name, body.data);
  if (result.ok) revalidatePath(`/bookings/${bookingRef}`);
  return result;
}

export async function setRoomVisibility(input: { roomId: string; visibility: string }): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = z.object({ roomId: z.string().min(1), visibility: z.enum(["everyone", "staff"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown room" };
  const result = await store.setRoomVisibility(parsed.data.roomId, parsed.data.visibility);
  if (result.ok) catalogChanged();
  return result;
}
