// After staff change what customers see (spaces, services, prices, photos), refresh the back office's pages and
// tell the booking app to clear its cached copy (its POST /api/revalidate). Needs BOOKING_APP_URL and
// CATALOG_REVALIDATE_SECRET (the same value as the booking app's); without them the booking app catches up on
// its own within 15 minutes.
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export function catalogChanged() {
  revalidatePath("/bookings", "layout");
  const url = process.env.BOOKING_APP_URL;
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  if (!url || !secret) return;
  // After the response, so staff don't wait for the booking app
  after(async () => {
    try {
      const res = await fetch(new URL("/api/revalidate", url), {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) console.error(`Booking app refresh failed: ${res.status}`);
    } catch (error) {
      console.error("Booking app refresh failed", error);
    }
  });
}
