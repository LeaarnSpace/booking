// Requests the back office makes to this app (clear the catalog cache, send queued messages). They carry
// BOOKING_APP_SECRET, the same value in both apps; without it these endpoints are off.
import { timingSafeEqual } from "node:crypto";

const matches = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** A response refusing the request, or null when it really came from the back office */
export function refuseUnlessBackoffice(request: Request) {
  const secret = process.env.BOOKING_APP_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return matches(given, secret) ? null : new Response("Unauthorized", { status: 401 });
}
