// The signed-in customer, for server components and server actions.
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { isStaffEmail } from "./env";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  /** Worked out from the email domain on every request, so changing the staff domains takes effect at once */
  isStaff: boolean;
}

/** The current customer, or null for guests. Cached for the length of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = session.user as typeof session.user & { phone?: string | null };
  return {
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase(),
    phone: user.phone ?? null,
    image: user.image ?? null,
    isStaff: isStaffEmail(user.email),
  };
});

/** Signed-in customer, or send them to sign up and come back to `next` afterwards */
export async function requireViewer(next: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-up?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Only follow redirects within this app */
export const safeNext = (next: string | null | undefined, fallback = "/") =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
