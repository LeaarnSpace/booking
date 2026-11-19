// What the website's build reads: roles that are listed or link-only and still open, in the order staff set; live
// news stories, newest first; live blog posts in the order staff set; and the category lists for the filters.
// Field names match the website's content collections (see the website repo's src/content.config.ts).
import { and, asc, desc, eq, gte, isNull, ne, or } from "drizzle-orm";
import type { CategoryKind, RelatedLink } from "./client.ts";
import { db } from "./db.ts";
import { category, news, post, role } from "./schema.ts";

export interface PublishedRole {
  /** The page's code, used as its address: /work-with-us/<id> */
  id: string;
  title: string;
  team: string;
  /** Teams sort by this in the website's filter */
  teamOrder: number;
  posted: string;
  location: string;
  arrangement: string;
  employmentType: string;
  salary?: string;
  reportsTo?: string;
  closesOn?: string;
  summary: string;
  /** Markdown; the website renders it */
  description: string;
  applyUrl?: string;
  applyEmail?: string;
  /** false: link only, so it has a page but isn't on the list */
  listed: boolean;
  order: number;
}

/** Today in Lagos, YYYY-MM-DD: a role closing today is still open */
const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);

export async function publishedRoles(): Promise<PublishedRole[]> {
  const rows = await db
    .select({
      id: role.code,
      title: role.title,
      team: category.name,
      teamOrder: category.sortOrder,
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
      order: role.sortOrder,
    })
    .from(role)
    .innerJoin(category, eq(category.id, role.teamId))
    .where(and(ne(role.visibility, "hidden"), or(isNull(role.closesOn), gte(role.closesOn, lagosToday()))))
    .orderBy(asc(role.sortOrder), desc(role.posted));
  // Leave out empty optional fields rather than sending null, so the website's optional fields stay simple
  return rows.map(({ visibility, salary, reportsTo, closesOn, applyUrl, applyEmail, ...r }) => ({
    ...r,
    listed: visibility === "listed",
    ...(salary ? { salary } : {}),
    ...(reportsTo ? { reportsTo } : {}),
    ...(closesOn ? { closesOn } : {}),
    ...(applyUrl ? { applyUrl } : {}),
    ...(applyEmail ? { applyEmail } : {}),
  }));
}

export interface PublishedNews {
  /** The story's address: /news/<id> */
  id: string;
  title: string;
  category: string;
  date: string;
  /** Media storage key; the back office turns it into the photo's public address */
  imageKey?: string;
  source?: string;
  sourceUrl?: string;
  summary?: string;
  author?: string;
  reviewer?: string;
  related: RelatedLink[];
  /** Markdown: our take on the story (empty for none) */
  body: string;
  order: number;
}

export async function publishedNews(): Promise<PublishedNews[]> {
  const rows = await db
    .select({
      id: news.slug,
      title: news.title,
      category: category.name,
      date: news.date,
      imageKey: news.imageKey,
      source: news.source,
      sourceUrl: news.sourceUrl,
      summary: news.summary,
      author: news.author,
      reviewer: news.reviewer,
      related: news.related,
      body: news.body,
    })
    .from(news)
    .innerJoin(category, eq(category.id, news.categoryId))
    .where(eq(news.status, "live"))
    .orderBy(desc(news.date), desc(news.createdAt));
  return rows.map((r, i) => ({ ...withoutEmpty(r), related: r.related, body: r.body, order: i + 1 }));
}

export interface PublishedPost {
  /** The post's address: /blog/<id> */
  id: string;
  title: string;
  excerpt: string;
  /** Media storage key; the back office turns it into the photo's public address */
  imageKey: string;
  category?: string;
  date?: string;
  duration?: string;
  /** Markdown */
  body: string;
  order: number;
}

/** Live posts that have a photo (a live post always should) */
export async function publishedPosts(): Promise<PublishedPost[]> {
  const rows = await db
    .select({
      id: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      imageKey: post.imageKey,
      category: category.name,
      date: post.date,
      duration: post.duration,
      body: post.body,
      order: post.sortOrder,
    })
    .from(post)
    .leftJoin(category, eq(category.id, post.categoryId))
    .where(eq(post.status, "live"))
    .orderBy(asc(post.sortOrder), asc(post.title));
  return rows
    .filter((r): r is typeof r & { imageKey: string } => Boolean(r.imageKey))
    .map((r) => ({ ...withoutEmpty(r), imageKey: r.imageKey, excerpt: r.excerpt, body: r.body }));
}

/** Category names in the order staff set, for the website's filters */
export async function publishedCategories(kind: CategoryKind): Promise<string[]> {
  const rows = await db
    .select({ name: category.name })
    .from(category)
    .where(eq(category.kind, kind))
    .orderBy(asc(category.sortOrder), asc(category.name));
  return rows.map((r) => r.name);
}

/** Drops null and empty-string fields, so the website's optional fields stay simple */
function withoutEmpty<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== "")) as {
    [K in keyof T]: Exclude<T[K], null>;
  };
}

/**
 * Whether staff have added anything (live or draft) to each kind. Until they have, the website keeps showing its
 * own Markdown files for that kind, so switching the site over to the back office never empties a page.
 */
export async function contentStarted(): Promise<Record<"roles" | "news" | "blog", boolean>> {
  const any = async (table: typeof role | typeof news | typeof post) =>
    (await db.select({ id: table.id }).from(table).limit(1)).length > 0;
  const [roles, newsStarted, blog] = await Promise.all([any(role), any(news), any(post)]);
  return { roles, news: newsStarted, blog };
}
