// News stories for the News page and the homepage. Newest first by date; there's no hand-set order.
import { and, desc, eq, ne } from "drizzle-orm";
import type { NewsInput, NewsRecord, Result, Status } from "./client.ts";
import { db } from "./db.ts";
import { contentChanged } from "./publish.ts";
import { category, news } from "./schema.ts";

const columns = {
  id: news.id,
  slug: news.slug,
  title: news.title,
  categoryId: news.categoryId,
  category: category.name,
  date: news.date,
  imageKey: news.imageKey,
  source: news.source,
  sourceUrl: news.sourceUrl,
  summary: news.summary,
  body: news.body,
  author: news.author,
  reviewer: news.reviewer,
  related: news.related,
  status: news.status,
  updatedAt: news.updatedAt,
  updatedBy: news.updatedBy,
};

export const listNews = (): Promise<NewsRecord[]> =>
  db
    .select(columns)
    .from(news)
    .innerJoin(category, eq(category.id, news.categoryId))
    .orderBy(desc(news.date), desc(news.createdAt));

export async function getNews(id: string): Promise<NewsRecord | null> {
  const [row] = await db
    .select(columns)
    .from(news)
    .innerJoin(category, eq(category.id, news.categoryId))
    .where(eq(news.id, id))
    .limit(1);
  return row ?? null;
}

async function categoryIs(id: string, kind: "news" | "blog") {
  const [row] = await db.select({ kind: category.kind }).from(category).where(eq(category.id, id)).limit(1);
  return row?.kind === kind;
}

async function slugTaken(slug: string, except: string | null) {
  const [row] = await db
    .select({ id: news.id })
    .from(news)
    .where(and(eq(news.slug, slug), except ? ne(news.id, except) : undefined))
    .limit(1);
  return Boolean(row);
}

/**
 * Adds a story (id null) or updates one. Returns its id, and the photo it no longer uses (for the caller to delete
 * from storage once this has saved).
 */
export async function saveNews(
  id: string | null,
  input: NewsInput,
  by: string,
): Promise<Result & { id?: string; replacedImageKey?: string | null }> {
  if (!(await categoryIs(input.categoryId, "news"))) return { ok: false, error: "Pick a category" };
  if (await slugTaken(input.slug, id)) {
    return { ok: false, error: `Another story already uses the address /news/${input.slug}` };
  }
  return db.transaction(async (tx) => {
    let savedId = id;
    let replacedImageKey: string | null = null;
    if (id) {
      const [before] = await tx.select({ imageKey: news.imageKey }).from(news).where(eq(news.id, id)).for("update");
      if (!before) return { ok: false, error: "This story no longer exists. Reload the page." };
      await tx
        .update(news)
        .set({ ...input, updatedBy: by })
        .where(eq(news.id, id));
      if (before.imageKey && before.imageKey !== input.imageKey) replacedImageKey = before.imageKey;
    } else {
      const [row] = await tx
        .insert(news)
        .values({ ...input, updatedBy: by })
        .returning({ id: news.id });
      savedId = row.id;
    }
    await contentChanged(tx, by);
    return { ok: true, id: savedId!, replacedImageKey };
  });
}

export async function setNewsStatus(id: string, status: Status, by: string): Promise<Result> {
  return db.transaction(async (tx) => {
    const done = await tx.update(news).set({ status, updatedBy: by }).where(eq(news.id, id)).returning({ id: news.id });
    if (!done.length) return { ok: false, error: "This story no longer exists. Reload the page." };
    await contentChanged(tx, by);
    return { ok: true };
  });
}

/** Removes the story; returns its photo's key for the caller to delete from storage */
export async function deleteNews(id: string, by: string): Promise<Result & { imageKey?: string | null }> {
  return db.transaction(async (tx) => {
    const [row] = await tx.delete(news).where(eq(news.id, id)).returning({ imageKey: news.imageKey });
    await contentChanged(tx, by);
    return { ok: true, imageKey: row?.imageKey ?? null };
  });
}
