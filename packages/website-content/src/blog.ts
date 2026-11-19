// Blog posts and episodes, in the order staff set (new posts go first).
import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { PostInput, PostRecord, Result, Status } from "./client.ts";
import { db } from "./db.ts";
import { moveInList } from "./order.ts";
import { contentChanged } from "./publish.ts";
import { category, post } from "./schema.ts";

const columns = {
  id: post.id,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  categoryId: post.categoryId,
  category: category.name,
  date: post.date,
  duration: post.duration,
  imageKey: post.imageKey,
  body: post.body,
  status: post.status,
  sortOrder: post.sortOrder,
  updatedAt: post.updatedAt,
  updatedBy: post.updatedBy,
};

const select = () => db.select(columns).from(post).leftJoin(category, eq(category.id, post.categoryId));

export const listPosts = (): Promise<PostRecord[]> => select().orderBy(asc(post.sortOrder), asc(post.title));

export async function getPost(id: string): Promise<PostRecord | null> {
  const [row] = await select().where(eq(post.id, id)).limit(1);
  return row ?? null;
}

async function isBlogCategory(id: string) {
  const [row] = await db.select({ kind: category.kind }).from(category).where(eq(category.id, id)).limit(1);
  return row?.kind === "blog";
}

async function slugTaken(slug: string, except: string | null) {
  const [row] = await db
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.slug, slug), except ? ne(post.id, except) : undefined))
    .limit(1);
  return Boolean(row);
}

/**
 * Adds a post (id null) at the top of the list, or updates one. Returns its id, and the photo it no longer uses
 * (for the caller to delete from storage once this has saved).
 */
export async function savePost(
  id: string | null,
  input: PostInput,
  by: string,
): Promise<Result & { id?: string; replacedImageKey?: string | null }> {
  if (input.categoryId && !(await isBlogCategory(input.categoryId))) return { ok: false, error: "Pick a category" };
  if (await slugTaken(input.slug, id)) {
    return { ok: false, error: `Another post already uses the address /blog/${input.slug}` };
  }
  return db.transaction(async (tx) => {
    let savedId = id;
    let replacedImageKey: string | null = null;
    if (id) {
      const [before] = await tx.select({ imageKey: post.imageKey }).from(post).where(eq(post.id, id)).for("update");
      if (!before) return { ok: false, error: "This post no longer exists. Reload the page." };
      await tx
        .update(post)
        .set({ ...input, updatedBy: by })
        .where(eq(post.id, id));
      if (before.imageKey && before.imageKey !== input.imageKey) replacedImageKey = before.imageKey;
    } else {
      // New posts go first: renumber the rest after it
      await tx.update(post).set({ sortOrder: sql`${post.sortOrder} + 1` });
      const [row] = await tx
        .insert(post)
        .values({ ...input, sortOrder: 1, updatedBy: by })
        .returning({ id: post.id });
      savedId = row.id;
    }
    await contentChanged(tx, by);
    return { ok: true, id: savedId!, replacedImageKey };
  });
}

export async function setPostStatus(id: string, status: Status, by: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ imageKey: post.imageKey }).from(post).where(eq(post.id, id)).limit(1);
    if (!row) return { ok: false, error: "This post no longer exists. Reload the page." };
    if (status === "live" && !row.imageKey) return { ok: false, error: "Add a photo before making it live" };
    await tx.update(post).set({ status, updatedBy: by }).where(eq(post.id, id));
    await contentChanged(tx, by);
    return { ok: true };
  });
}

export async function movePost(id: string, direction: "up" | "down", by: string) {
  const order = moveInList(await listPosts(), id, direction);
  if (!order) return;
  await db.transaction(async (tx) => {
    for (const o of order) await tx.update(post).set({ sortOrder: o.sortOrder }).where(eq(post.id, o.id));
    await contentChanged(tx, by);
  });
}

/** Removes the post; returns its photo's key for the caller to delete from storage */
export async function deletePost(id: string, by: string): Promise<Result & { imageKey?: string | null }> {
  return db.transaction(async (tx) => {
    const [row] = await tx.delete(post).where(eq(post.id, id)).returning({ imageKey: post.imageKey });
    await contentChanged(tx, by);
    return { ok: true, imageKey: row?.imageKey ?? null };
  });
}
