// Requests to the booking app after staff change something there, sent after the response so staff don't wait.
// Needs BOOKING_APP_URL and BOOKING_APP_SECRET (the same value as the booking app's); without them the booking
// app catches up on its own: its cached catalog within 15 minutes, queued messages on its next change or daily job.
import { revalidatePath } from "next/cache";
import { after } from "next/server";

function callBookingApp(path: string) {
  const url = process.env.BOOKING_APP_URL;
  const secret = process.env.BOOKING_APP_SECRET;
  if (!url || !secret) return;
  after(async () => {
    try {
      const res = await fetch(new URL(path, url), {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) console.error(`Booking app ${path} failed: ${res.status}`);
    } catch (error) {
      console.error(`Booking app ${path} failed`, error);
    }
  });
}

/** Staff changed what customers see (spaces, services, prices, photos): refresh pages here and in the booking app */
export function catalogChanged() {
  revalidatePath("/bookings", "layout");
  callBookingApp("/api/revalidate");
}

/** A booking decision queued emails or Slack posts: the booking app sends them (it holds those settings) */
export function messagesQueued() {
  callBookingApp("/api/outbox");
}
