// Teams and categories, edited by staff. A category in use can't be deleted; renaming one changes it everywhere.
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { Category, CategoryKind, Result } from "./client.ts";
import { db } from "./db.ts";
import { moveInList } from "./order.ts";
import { contentChanged } from "./publish.ts";
import { category, news, post, role } from "./schema.ts";

/** How many items use each category, per kind */
const usage = {
  team: () => db.select({ id: role.teamId, n: count() }).from(role).groupBy(role.teamId),
  news: () => db.select({ id: news.categoryId, n: count() }).from(news).groupBy(news.categoryId),
  blog: async () =>
    (await db.select({ id: post.categoryId, n: count() }).from(post).groupBy(post.categoryId)).filter(
      (r): r is { id: string; n: number } => r.id !== null,
    ),
} satisfies Record<CategoryKind, () => Promise<{ id: string; n: number }[]>>;

export async function listCategories(kind: CategoryKind): Promise<Category[]> {
  const [rows, used] = await Promise.all([
    db
      .select({ id: category.id, kind: category.kind, name: category.name, sortOrder: category.sortOrder })
      .from(category)
      .where(eq(category.kind, kind))
      .orderBy(asc(category.sortOrder), asc(category.name)),
    usage[kind](),
  ]);
  const counts = new Map(used.map((u) => [u.id, u.n]));
  return rows.map((r) => ({ ...r, used: counts.get(r.id) ?? 0 }));
}

async function nameTaken(kind: CategoryKind, name: string, except?: string) {
  const [row] = await db
    .select({ id: category.id })
    .from(category)
    .where(
      and(
        eq(category.kind, kind),
        sql`lower(${category.name}) = lower(${name})`,
        except ? ne(category.id, except) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Adds a category (id null) at the end of the list, or renames one */
export async function saveCategory(kind: CategoryKind, id: string | null, name: string, by: string): Promise<Result> {
  if (await nameTaken(kind, name, id ?? undefined)) return { ok: false, error: `There's already one called ${name}` };
  return db.transaction(async (tx) => {
    if (id) {
      const done = await tx
        .update(category)
        .set({ name, updatedBy: by })
        .where(and(eq(category.id, id), eq(category.kind, kind)))
        .returning({ id: category.id });
      if (!done.length) return { ok: false, error: "That no longer exists. Reload the page." };
    } else {
      const [{ last }] = await tx
        .select({ last: sql<number>`coalesce(max(${category.sortOrder}), 0)` })
        .from(category)
        .where(eq(category.kind, kind));
      await tx.insert(category).values({ kind, name, sortOrder: Number(last) + 1, updatedBy: by });
    }
    await contentChanged(tx, by);
    return { ok: true };
  });
}

export async function deleteCategory(kind: CategoryKind, id: string, by: string): Promise<Result> {
  const used = (await usage[kind]()).find((u) => u.id === id)?.n ?? 0;
  if (used) return { ok: false, error: `It's still used ${used === 1 ? "once" : `${used} times`}. Move those first.` };
  return db.transaction(async (tx) => {
    await tx.delete(category).where(and(eq(category.id, id), eq(category.kind, kind)));
    await contentChanged(tx, by);
    return { ok: true };
  });
}

export async function moveCategory(kind: CategoryKind, id: string, direction: "up" | "down", by: string) {
  const order = moveInList(await listCategories(kind), id, direction);
  if (!order) return;
  await db.transaction(async (tx) => {
    for (const o of order) await tx.update(category).set({ sortOrder: o.sortOrder }).where(eq(category.id, o.id));
    await contentChanged(tx, by);
  });
}
