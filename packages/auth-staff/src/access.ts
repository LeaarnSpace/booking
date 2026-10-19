// The only way apps read or change staff people and their access. Callers are responsible for
// checking the *caller's* permission first (e.g. requireSection("team", "manager")).
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { sectionAccess, session, user, type Role, type Section } from "./schema";

/** Section → role for one person; a missing section means no access */
export type Access = Partial<Record<Section, Role>>;

export interface StaffMember {
  email: string;
  name: string | null;
  image: string | null;
  /** False until they sign in for the first time */
  joined: boolean;
  access: Access;
}

const normalise = (email: string) => email.trim().toLowerCase();

export async function getAccess(email: string): Promise<Access> {
  const grants = await db
    .select()
    .from(sectionAccess)
    .where(eq(sectionAccess.email, normalise(email)));
  return Object.fromEntries(grants.map((g) => [g.section, g.role]));
}

/** Everyone who has signed in or been granted access, alphabetical by name then email */
export async function listStaff(): Promise<StaffMember[]> {
  const [users, grants] = await Promise.all([
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(sectionAccess),
  ]);
  const people = new Map<string, StaffMember>();
  for (const u of users) {
    const email = normalise(u.email);
    people.set(email, { email, name: u.name, image: u.image, joined: true, access: {} });
  }
  for (const g of grants) {
    const person = people.get(g.email) ?? { email: g.email, name: null, image: null, joined: false, access: {} };
    person.access[g.section] = g.role;
    people.set(g.email, person);
  }
  return [...people.values()].sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

/** Emails of the people who manage the Team section */
export async function listTeamManagers(): Promise<string[]> {
  const rows = await db
    .select({ email: sectionAccess.email })
    .from(sectionAccess)
    .where(and(eq(sectionAccess.section, "team"), eq(sectionAccess.role, "manager")));
  return rows.map((r) => r.email);
}

/** True if everyone else would be left without a Team manager role were `email` to lose theirs */
export async function isLastTeamManager(email: string) {
  const others = await db
    .select({ email: sectionAccess.email })
    .from(sectionAccess)
    .where(
      and(
        eq(sectionAccess.section, "team"),
        eq(sectionAccess.role, "manager"),
        ne(sectionAccess.email, normalise(email)),
      ),
    );
  return others.length === 0;
}

/** Give `role` in `section` (or take the section away with null) */
export async function setSectionRole(email: string, section: Section, role: Role | null, grantedBy: string) {
  const target = normalise(email);
  if (role === null) {
    await db.delete(sectionAccess).where(and(eq(sectionAccess.email, target), eq(sectionAccess.section, section)));
    return;
  }
  await db
    .insert(sectionAccess)
    .values({ email: target, section, role, grantedBy })
    .onConflictDoUpdate({ target: [sectionAccess.email, sectionAccess.section], set: { role, grantedBy } });
}

/** Full access to every section (used for the first admins) */
export async function grantEverything(email: string, sections: readonly Section[]) {
  await db
    .insert(sectionAccess)
    .values(sections.map((section) => ({ email: normalise(email), section, role: "manager" as const })))
    .onConflictDoNothing();
}

/** Takes away all access and ends every session the person has */
export async function removeStaffMember(email: string) {
  const target = normalise(email);
  await db.delete(sectionAccess).where(eq(sectionAccess.email, target));
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, target));
  if (account) await db.delete(session).where(eq(session.userId, account.id));
}
