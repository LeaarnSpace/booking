// Next.js glue, so apps don't depend on the auth library directly (swapping it later only touches
// this package).
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";

export { nextCookies, toNextJsHandler };

/** Cheap check for a session cookie (no database call); pages still verify the session */
export const hasSessionCookie = (request: NextRequest, cookiePrefix: string) =>
  Boolean(getSessionCookie(request, { cookiePrefix }));
