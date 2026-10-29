// Called by the back office after staff change spaces, services, prices or photos: clears the cached catalog
// (see lib/catalog.ts).
import { revalidateTag } from "next/cache";
import { refuseUnlessBackoffice } from "@/lib/backoffice-calls";
import { CATALOG_TAG } from "@/lib/catalog";

export async function POST(request: Request) {
  const refused = refuseUnlessBackoffice(request);
  if (refused) return refused;
  // Expire now: the next visitor gets fresh data rather than one more stale page
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
