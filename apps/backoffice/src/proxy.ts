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
  // Everything except sign-in, the auth API, static files, local file storage (its links are signed instead) and
  // the content the website's build reads (it carries a secret instead)
  matcher: [
    "/((?!sign-in|api/auth|api/local-storage|api/website-content|_next|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)",
  ],
};
