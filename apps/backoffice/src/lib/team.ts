// Read helpers for people and their access.
import { and, asc, eq } from "drizzle-orm";
import { db, sectionAccess, user } from "@learnspace/db";
import type { Access, Role, Section } from "./sections";

export interface Person {
  email: string;
  name: string | null;
  image: string | null;
  /** False until they sign in for the first time */
  joined: boolean;
  access: Access;
}

/** Everyone who has signed in or been granted access, alphabetical by name then email */
export async function listPeople(): Promise<Person[]> {
  const [users, grants] = await Promise.all([
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(sectionAccess),
  ]);
  const people = new Map<string, Person>();
  for (const u of users) {
    const email = u.email.toLowerCase();
    people.set(email, { email, name: u.name, image: u.image, joined: true, access: {} });
  }
  for (const g of grants) {
    const person = people.get(g.email) ?? { email: g.email, name: null, image: null, joined: false, access: {} };
    person.access[g.section as Section] = g.role as Role;
    people.set(g.email, person);
  }
  return [...people.values()].sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

/** People who manage the Team section (the ones to ask for access) */
export async function listTeamManagers() {
  const rows = await db
    .select({ email: sectionAccess.email })
    .from(sectionAccess)
    .where(and(eq(sectionAccess.section, "team"), eq(sectionAccess.role, "manager")));
  return rows.map((r) => r.email);
}
