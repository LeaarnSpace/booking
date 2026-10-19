// Next.js glue, so apps don't depend on the auth library directly (swapping it later only touches
// this package).
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { STAFF_COOKIE_PREFIX } from "./auth";

export { nextCookies, toNextJsHandler };

/** Cheap check for a staff session cookie (no database call); pages still verify the session */
export const hasStaffSessionCookie = (request: NextRequest) =>
  Boolean(getSessionCookie(request, { cookiePrefix: STAFF_COOKIE_PREFIX }));
