"use server";
// Switching customer emails and Slack posts on or off, and resending or discarding ones that failed. Editors of
// Bookings only.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { discardMessage, retryMessage, setMessageSetting } from "@learnspace/bookings";
import { MESSAGES, type MessageId } from "@learnspace/bookings/client";
import { messagesQueued } from "@/lib/booking-app";
import type { Result } from "@/lib/bookings/store";
import { requireSection } from "@/lib/viewer";

const messageId = z.enum(MESSAGES.map((m) => m.id) as [MessageId, ...MessageId[]]);

export async function setMessageEnabled(input: { id: string; enabled: boolean }): Promise<Result> {
  const me = await requireSection("bookings", "editor");
  const parsed = z.object({ id: messageId, enabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown message" };
  await setMessageSetting(parsed.data.id, parsed.data.enabled, me.email);
  revalidatePath("/bookings/notifications");
  return { ok: true };
}

export async function resendMessage(id: number): Promise<Result> {
  await requireSection("bookings", "editor");
  if (!Number.isInteger(id)) return { ok: false, error: "Unknown message" };
  await retryMessage(id);
  messagesQueued();
  revalidatePath("/bookings/notifications");
  return { ok: true };
}

export async function dropMessage(id: number): Promise<Result> {
  await requireSection("bookings", "editor");
  if (!Number.isInteger(id)) return { ok: false, error: "Unknown message" };
  await discardMessage(id);
  revalidatePath("/bookings/notifications");
  return { ok: true };
}
