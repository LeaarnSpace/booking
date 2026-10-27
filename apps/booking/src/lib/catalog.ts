// Spaces, services, prices and photos for the pages, cached so browsing doesn't need the database (or wake it).
// The back office clears the cache when staff save a change (POST /api/revalidate), so changes show at once;
// the time limit is only a safety net in case that call is missed. Server actions that price or create a
// booking read @learnspace/bookings directly, so they always use the current prices.
// In development the cache is skipped, so changes made in a local back office show straight away.
import { unstable_cache } from "next/cache";
import { getSpace as loadSpace, listSpaces as loadSpaces } from "@learnspace/bookings";
import { env } from "./env";

export const CATALOG_TAG = "catalog";

const options = { tags: [CATALOG_TAG], revalidate: 15 * 60 };

export const listSpaces = env.production ? unstable_cache(loadSpaces, ["catalog-list"], options) : loadSpaces;

export const getSpace = env.production ? unstable_cache(loadSpace, ["catalog-space"], options) : loadSpace;
