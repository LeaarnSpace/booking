// Fast check before any page renders: no staff session cookie → straight to the sign-in page.
// (Pages still verify the session and access on the server; this only saves a round trip.)
import { NextResponse, type NextRequest } from "next/server";
import { hasStaffSessionCookie } from "@learnspace/auth-staff/next";

export function proxy(request: NextRequest) {
  if (!hasStaffSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except sign-in, the auth API and static files
  matcher: ["/((?!sign-in|api/auth|_next|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
