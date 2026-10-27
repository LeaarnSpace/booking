// Called by the back office after staff change spaces, services, prices or photos: clears the cached catalog
// (see lib/catalog.ts). Needs CATALOG_REVALIDATE_SECRET, the same value in both apps; without it this is off.
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";

const matches = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!matches(given, secret)) return new Response("Unauthorized", { status: 401 });
  // Expire now: the next visitor gets fresh data rather than one more stale page
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
