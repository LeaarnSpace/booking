// Job roles for the Work With Us page.
import { asc, desc, eq, sql } from "drizzle-orm";
import type { Result, RoleInput, RoleRecord, Visibility } from "./client.ts";
import { newRoleCode } from "./code.ts";
import { db } from "./db.ts";
import { moveInList } from "./order.ts";
import { contentChanged } from "./publish.ts";
import { category, role } from "./schema.ts";

const columns = {
  id: role.id,
  code: role.code,
  title: role.title,
  teamId: role.teamId,
  team: category.name,
  posted: role.posted,
  location: role.location,
  arrangement: role.arrangement,
  employmentType: role.employmentType,
  salary: role.salary,
  reportsTo: role.reportsTo,
  closesOn: role.closesOn,
  summary: role.summary,
  description: role.description,
  applyUrl: role.applyUrl,
  applyEmail: role.applyEmail,
  visibility: role.visibility,
  sortOrder: role.sortOrder,
  updatedAt: role.updatedAt,
  updatedBy: role.updatedBy,
};

const ordered = () =>
  db
    .select(columns)
    .from(role)
    .innerJoin(category, eq(category.id, role.teamId))
    .orderBy(asc(role.sortOrder), desc(role.posted), asc(role.title));

export const listRoles = (): Promise<RoleRecord[]> => ordered();

export async function getRole(id: string): Promise<RoleRecord | null> {
  const [row] = await db
    .select(columns)
    .from(role)
    .innerJoin(category, eq(category.id, role.teamId))
    .where(eq(role.id, id))
    .limit(1);
  return row ?? null;
}

async function teamExists(teamId: string) {
  const [row] = await db.select({ kind: category.kind }).from(category).where(eq(category.id, teamId)).limit(1);
  return row?.kind === "team";
}

/** Adds a role (id null) at the top of the list, or updates one. Returns the role's id. */
export async function saveRole(id: string | null, input: RoleInput, by: string): Promise<Result & { id?: string }> {
  if (!(await teamExists(input.teamId))) return { ok: false, error: "Pick a team" };
  return db.transaction(async (tx) => {
    let savedId = id;
    if (id) {
      const done = await tx
        .update(role)
        .set({ ...input, updatedBy: by })
        .where(eq(role.id, id))
        .returning({ id: role.id });
      if (!done.length) return { ok: false, error: "This role no longer exists. Reload the page." };
    } else {
      // New roles go first: renumber the rest after it
      await tx.update(role).set({ sortOrder: sql`${role.sortOrder} + 1` });
      const [row] = await tx
        .insert(role)
        .values({ ...input, code: newRoleCode(), sortOrder: 1, updatedBy: by })
        .returning({ id: role.id });
      savedId = row.id;
    }
    await contentChanged(tx, by);
    return { ok: true, id: savedId! };
  });
}

async function updateOne(id: string, set: Partial<typeof role.$inferInsert>, by: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const done = await tx
      .update(role)
      .set({ ...set, updatedBy: by })
      .where(eq(role.id, id))
      .returning({ id: role.id });
    if (!done.length) return { ok: false, error: "This role no longer exists. Reload the page." };
    await contentChanged(tx, by);
    return { ok: true };
  });
}

export const setRoleVisibility = (id: string, visibility: Visibility, by: string) => updateOne(id, { visibility }, by);

/** A new page address for the role; the old one stops working at the next publish */
export const newRoleLink = (id: string, by: string) => updateOne(id, { code: newRoleCode() }, by);

export async function deleteRole(id: string, by: string): Promise<Result> {
  return db.transaction(async (tx) => {
    await tx.delete(role).where(eq(role.id, id));
    await contentChanged(tx, by);
    return { ok: true };
  });
}

export async function moveRole(id: string, direction: "up" | "down", by: string) {
  const order = moveInList(await listRoles(), id, direction);
  if (!order) return;
  await db.transaction(async (tx) => {
    for (const o of order) await tx.update(role).set({ sortOrder: o.sortOrder }).where(eq(role.id, o.id));
    await contentChanged(tx, by);
  });
}
