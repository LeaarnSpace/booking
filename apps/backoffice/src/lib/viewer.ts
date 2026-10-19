// The signed-in person and their access, for server components and server actions.
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccess, isAllowedEmail } from "@learnspace/auth-staff";
import { auth } from "./auth";
import { env } from "./env";
import { can, type Access, type Role, type Section } from "./sections";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  image: string | null;
  access: Access;
}

/** The current person, or null when signed out. Cached for the length of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  // Re-check the domain on every request, in case the allowed list changed
  if (!session || !isAllowedEmail(session.user.email, env.allowedDomains)) return null;
  const email = session.user.email.toLowerCase();
  return {
    id: session.user.id,
    name: session.user.name,
    email,
    image: session.user.image ?? null,
    access: await getAccess(email),
  };
});

/** Signed-in person, or send them to the sign-in page */
export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return viewer;
}

/**
 * Guard for a section's pages and actions: signed in, and at least `min` in `section`.
 * Everything that reads or changes section data must call this on the server.
 */
export async function requireSection(section: Section, min: Role = "viewer") {
  const viewer = await requireViewer();
  if (!can(viewer.access, section, min)) redirect(`/no-access?section=${section}`);
  return viewer;
}
