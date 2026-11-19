"use server";
// Changes to website content: job roles, news stories, blog posts, their teams and categories, photos, and publishing. Each action re-checks
// the caller's access to the Website section: editors add, change and publish; deleting needs a manager.
// Changes stay in the back office until someone publishes (see lib/website.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as content from "@learnspace/website-content";
import {
  ARRANGEMENTS,
  CATEGORY_KINDS,
  EMPLOYMENT_TYPES,
  IMAGE_KEY_PATTERN,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_RELATED,
  RELATED_TYPES,
  SLUG_PATTERN,
  STATUSES,
  VISIBILITIES,
  slugify,
  type CategoryKind,
  type Result,
  type Status,
  type Visibility,
} from "@learnspace/website-content/client";
import { hasHtml } from "@/lib/markdown";
import { mediaStorage } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { publishWebsite } from "@/lib/website";

const firstError = (e: z.ZodError): Result => ({ ok: false, error: e.issues[0].message });

const changed = () => revalidatePath("/website", "layout");

/* ---------- Roles ---------- */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const roleInput = z
  .object({
    title: z.string().trim().min(2, "Give the role a title").max(80),
    teamId: z.string().uuid("Pick a team"),
    employmentType: z.enum(EMPLOYMENT_TYPES, "Pick the type of job"),
    arrangement: z.enum(ARRANGEMENTS, "Pick remote, hybrid or on-site"),
    location: z.string().trim().min(2, "Add a location").max(60),
    posted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date it was posted"),
    closesOn: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a closing date, or leave it empty")
      .transform((v) => v || null),
    salary: optional(80),
    reportsTo: optional(80),
    summary: z.string().trim().max(300, "Keep the summary under 300 characters"),
    description: z
      .string()
      .trim()
      .max(20_000, "The description is too long")
      .refine((v) => !hasHtml(v), "Use the toolbar or Markdown for formatting: HTML tags aren’t allowed"),
    applyUrl: optional(500).refine(
      (v) => !v || /^https?:\/\/\S+\.\S+/.test(v),
      "Use a full link starting with https://",
    ),
    applyEmail: optional(120).refine(
      (v) => !v || z.email().safeParse(v).success,
      "That email address doesn’t look right",
    ),
    visibility: z.enum(VISIBILITIES),
  })
  .refine((r) => r.visibility === "hidden" || r.applyUrl || r.applyEmail, {
    message: "Add an application link or email, so people can apply",
  })
  .refine((r) => !r.closesOn || r.closesOn >= r.posted, { message: "The closing date is before the posted date" });

export async function saveRole(id: string | null, _: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const text = (name: string) => String(form.get(name) ?? "");
  const parsed = roleInput.safeParse({
    title: text("title"),
    teamId: text("teamId"),
    employmentType: text("employmentType"),
    arrangement: text("arrangement"),
    location: text("location"),
    posted: text("posted"),
    closesOn: text("closesOn"),
    salary: text("salary"),
    reportsTo: text("reportsTo"),
    summary: text("summary"),
    description: text("description"),
    applyUrl: text("applyUrl"),
    applyEmail: text("applyEmail"),
    visibility: text("visibility"),
  });
  if (!parsed.success) return firstError(parsed.error);
  const result = await content.saveRole(id, parsed.data, viewer.email);
  if (!result.ok) return result;
  changed();
  redirect("/website/roles?saved=1");
}

export async function setRoleVisibility(id: string, visibility: Visibility): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const result = await content.setRoleVisibility(id, z.enum(VISIBILITIES).parse(visibility), viewer.email);
  changed();
  return result;
}

export async function newRoleLink(id: string): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const result = await content.newRoleLink(id, viewer.email);
  changed();
  return result;
}

export async function moveRole(id: string, direction: "up" | "down") {
  const viewer = await requireSection("website", "editor");
  await content.moveRole(id, direction, viewer.email);
  changed();
}

export async function deleteRole(id: string): Promise<Result> {
  const viewer = await requireSection("website", "manager");
  const result = await content.deleteRole(id, viewer.email);
  if (!result.ok) return result;
  changed();
  redirect("/website/roles");
}

/* ---------- Photos for news and blog ---------- */

type Area = "news" | "blog";

/** A signed link for the browser to upload one photo straight to media storage */
export async function requestImageUpload(
  area: Area,
  file: { contentType: string; size: number },
): Promise<Result & { upload?: { url: string; headers: Record<string, string> }; key?: string }> {
  await requireSection("website", "editor");
  const ext = IMAGE_TYPES[file.contentType as keyof typeof IMAGE_TYPES];
  if (!ext || (area !== "news" && area !== "blog")) return { ok: false, error: "Photos must be JPEG, PNG or WebP" };
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Photos must be under 5 MB" };
  }
  const key = `website/${area}/${crypto.randomUUID()}.${ext}`;
  const upload = await (await mediaStorage()).createUploadUrl(key, { contentType: file.contentType, size: file.size });
  return { ok: true, key, upload: { url: upload.url, headers: upload.headers } };
}

/** The photo the form is saving: one uploaded through requestImageUpload that actually arrived, or none */
async function checkImage(area: Area, key: string | null): Promise<Result> {
  if (!key) return { ok: true };
  if (!IMAGE_KEY_PATTERN.test(key) || !key.startsWith(`website/${area}/`)) return { ok: false, error: "Unknown photo" };
  const info = await (await mediaStorage()).head(key);
  if (!info) return { ok: false, error: "The photo didn’t finish uploading. Please add it again." };
  if (!(info.contentType && info.contentType in IMAGE_TYPES) || info.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "That file isn’t a supported photo" };
  }
  return { ok: true };
}

/** Removes a photo nothing uses any more. A failure only leaves a stray file behind, so it doesn't stop the save. */
async function dropImage(key: string | null | undefined) {
  if (!key) return;
  try {
    await (await mediaStorage()).delete(key);
  } catch (error) {
    console.error(`Couldn't delete unused photo ${key}`, error);
  }
}

const markdown = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "The text is too long")
    .refine((v) => !hasHtml(v), "Use the toolbar or Markdown for formatting: HTML tags aren’t allowed");

const isoDate = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

const link = (max: number) =>
  optional(max).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Use a full link starting with https://");

/** The web address: what was typed, or else made from the title */
const slugFrom = (typed: string, title: string) => slugify(typed) || slugify(title);
const slug = z
  .string()
  .min(3, "Add a web address of at least 3 letters")
  .max(80)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes in the web address");

/* ---------- News ---------- */

const relatedLink = z.object({
  type: z.enum(RELATED_TYPES),
  title: z.string().trim().min(2, "Give each related card a title").max(120),
  linkLabel: z.string().trim().min(2, "Give each related card a link label").max(40),
  href: z
    .string()
    .trim()
    .max(500)
    .refine((v) => /^\/[\w\-/#?=&.]*$/.test(v) || /^https?:\/\/\S+\.\S+/.test(v), {
      message: "Related links must be a website page (starting with /) or a full https:// link",
    }),
});

const newsInput = z.object({
  slug,
  title: z.string().trim().min(5, "Give the story a headline").max(160),
  categoryId: z.string().uuid("Pick a category"),
  date: isoDate("Pick the story’s date"),
  imageKey: z.string().transform((v) => v || null),
  source: optional(80),
  sourceUrl: link(500),
  summary: z.string().trim().max(400, "Keep the summary under 400 characters"),
  body: markdown(20_000),
  author: optional(80),
  reviewer: optional(80),
  related: z.array(relatedLink).max(MAX_RELATED, `Up to ${MAX_RELATED} related cards`),
  status: z.enum(STATUSES),
});

/** The related cards come from the form as JSON (see related-links.tsx) */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text || "[]");
  } catch {
    return null;
  }
}

export async function saveNews(id: string | null, _: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const text = (name: string) => String(form.get(name) ?? "");
  const parsed = newsInput.safeParse({
    slug: slugFrom(text("slug"), text("title")),
    title: text("title"),
    categoryId: text("categoryId"),
    date: text("date"),
    imageKey: text("imageKey"),
    source: text("source"),
    sourceUrl: text("sourceUrl"),
    summary: text("summary"),
    body: text("body"),
    author: text("author"),
    reviewer: text("reviewer"),
    related: parseJson(text("related")),
    status: text("status"),
  });
  if (!parsed.success) return firstError(parsed.error);
  const image = await checkImage("news", parsed.data.imageKey);
  if (!image.ok) return image;
  const result = await content.saveNews(id, parsed.data, viewer.email);
  if (!result.ok) return result;
  await dropImage(result.replacedImageKey);
  changed();
  redirect("/website/news?saved=1");
}

export async function setNewsStatus(id: string, status: Status): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const result = await content.setNewsStatus(id, z.enum(STATUSES).parse(status), viewer.email);
  changed();
  return result;
}

export async function deleteNews(id: string): Promise<Result> {
  const viewer = await requireSection("website", "manager");
  const result = await content.deleteNews(id, viewer.email);
  if (!result.ok) return result;
  await dropImage(result.imageKey);
  changed();
  redirect("/website/news");
}

/* ---------- Blog ---------- */

const postInput = z
  .object({
    slug,
    title: z.string().trim().min(5, "Give the post a title").max(160),
    excerpt: z
      .string()
      .trim()
      .min(10, "Add a line or two for the cards")
      .max(300, "Keep the excerpt under 300 characters"),
    categoryId: z
      .string()
      .transform((v) => v || null)
      .refine((v) => !v || z.uuid().safeParse(v).success, "Pick a category"),
    date: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a date, or leave it empty")
      .transform((v) => v || null),
    duration: optional(20),
    imageKey: z.string().transform((v) => v || null),
    body: markdown(50_000),
    status: z.enum(STATUSES),
  })
  .refine((p) => p.status === "draft" || p.imageKey, { message: "Add a photo: live posts need one for their card" });

export async function savePost(id: string | null, _: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const text = (name: string) => String(form.get(name) ?? "");
  const parsed = postInput.safeParse({
    slug: slugFrom(text("slug"), text("title")),
    title: text("title"),
    excerpt: text("excerpt"),
    categoryId: text("categoryId"),
    date: text("date"),
    duration: text("duration"),
    imageKey: text("imageKey"),
    body: text("body"),
    status: text("status"),
  });
  if (!parsed.success) return firstError(parsed.error);
  const image = await checkImage("blog", parsed.data.imageKey);
  if (!image.ok) return image;
  const result = await content.savePost(id, parsed.data, viewer.email);
  if (!result.ok) return result;
  await dropImage(result.replacedImageKey);
  changed();
  redirect("/website/blog?saved=1");
}

export async function setPostStatus(id: string, status: Status): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const result = await content.setPostStatus(id, z.enum(STATUSES).parse(status), viewer.email);
  changed();
  return result;
}

export async function movePost(id: string, direction: "up" | "down") {
  const viewer = await requireSection("website", "editor");
  await content.movePost(id, direction, viewer.email);
  changed();
}

export async function deletePost(id: string): Promise<Result> {
  const viewer = await requireSection("website", "manager");
  const result = await content.deletePost(id, viewer.email);
  if (!result.ok) return result;
  await dropImage(result.imageKey);
  changed();
  redirect("/website/blog");
}

/* ---------- Teams and categories ---------- */

const kind = z.enum(CATEGORY_KINDS);
const categoryName = z.string().trim().min(2, "Use at least 2 letters").max(40, "Keep it under 40 characters");

export async function saveCategory(
  categoryKind: CategoryKind,
  id: string | null,
  _: Result | null,
  form: FormData,
): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const parsed = categoryName.safeParse(form.get("name"));
  if (!parsed.success) return firstError(parsed.error);
  const result = await content.saveCategory(kind.parse(categoryKind), id, parsed.data, viewer.email);
  if (result.ok) changed();
  return result;
}

export async function moveCategory(categoryKind: CategoryKind, id: string, direction: "up" | "down") {
  const viewer = await requireSection("website", "editor");
  await content.moveCategory(kind.parse(categoryKind), id, direction, viewer.email);
  changed();
}

export async function deleteCategory(categoryKind: CategoryKind, id: string): Promise<Result> {
  const viewer = await requireSection("website", "manager");
  const result = await content.deleteCategory(kind.parse(categoryKind), id, viewer.email);
  if (result.ok) changed();
  return result;
}

/* ---------- Publishing ---------- */

export async function publish(): Promise<Result> {
  const viewer = await requireSection("website", "editor");
  const result = await publishWebsite(viewer.email);
  changed();
  return result;
}
