// Types and constants for website content, safe to import in the browser (no database code).

/** What a category groups: job roles by team, news stories, blog posts */
export const CATEGORY_KINDS = ["team", "news", "blog"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_LABELS: Record<CategoryKind, { one: string; many: string }> = {
  team: { one: "team", many: "Teams" },
  news: { one: "category", many: "News categories" },
  blog: { one: "category", many: "Blog categories" },
};

export const ARRANGEMENTS = ["Remote", "Hybrid", "On-site"] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  /** Lower numbers come first */
  sortOrder: number;
  /** How many items use it (it can only be deleted at 0) */
  used: number;
}

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/** Listed: on the Work With Us page and its own page. Link only: its own page, shared by link. Hidden: neither. */
export const VISIBILITIES = ["listed", "link", "hidden"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, { label: string; hint: string }> = {
  listed: { label: "Listed", hint: "On the Work With Us page, with its own page" },
  link: { label: "Link only", hint: "Its own page, not listed: share the link yourself" },
  hidden: { label: "Hidden", hint: "Not on the website" },
};

export interface RoleInput {
  title: string;
  teamId: string;
  /** YYYY-MM-DD */
  posted: string;
  location: string;
  arrangement: Arrangement;
  employmentType: EmploymentType;
  /** Free text, e.g. "₦400k–₦600k a month"; null leaves it off the page */
  salary: string | null;
  /** Who the role reports to, e.g. "Head of Research"; null leaves it off the page */
  reportsTo: string | null;
  /** YYYY-MM-DD; the role leaves the website at the first build after this date */
  closesOn: string | null;
  /** One or two lines at the top of the job page and in link previews */
  summary: string;
  /** The job description, in Markdown */
  description: string;
  /** Where "Apply" leads: a form or page, or else an email address */
  applyUrl: string | null;
  applyEmail: string | null;
  visibility: Visibility;
}

export interface RoleRecord extends RoleInput {
  id: string;
  /** The random part of the job page's address, e.g. /work-with-us/k7f3q9xm2a */
  code: string;
  team: string;
  sortOrder: number;
  updatedAt: Date;
  updatedBy: string | null;
}

/** What a new role's description starts as: the job page's sections ("##" headings, "###" for small labels) */
export const JOB_DESCRIPTION_TEMPLATE = `## About the role

What this person will own, and why it matters.

## What you will do

- 

## What we are looking for

- 

### Nice to have

- 
`;

/** Path of a role's page on the website */
export const rolePath = (code: string) => `/work-with-us/${code}`;

/** Live: on the website from the next publish. Draft: kept in the back office only. */
export const STATUSES = ["live", "draft"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, { label: string; hint: string }> = {
  live: { label: "Live", hint: "On the website from the next publish" },
  draft: { label: "Draft", hint: "Kept here, not on the website" },
};

/** The kinds of card under "Related from LearnSpace" on a news story */
export const RELATED_TYPES = ["Podcast", "Insights", "Blog", "Report"] as const;
export type RelatedType = (typeof RELATED_TYPES)[number];

export interface RelatedLink {
  type: RelatedType;
  title: string;
  /** e.g. "Watch episode" */
  linkLabel: string;
  /** A page on the website ("/blog/…") or a full link */
  href: string;
}

/** Up to this many related cards per story */
export const MAX_RELATED = 4;

/** A news story: a story from another publisher, with our framing and (optionally) our take on it */
export interface NewsInput {
  /** The story's address on the website: /news/<slug> */
  slug: string;
  title: string;
  categoryId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Media storage key of the photo, or null for none */
  imageKey: string | null;
  /** The original publisher, and the link to the story there */
  source: string | null;
  sourceUrl: string | null;
  /** A line or two in our own words about what the story says */
  summary: string;
  /** "Why this matters": our take, in Markdown; empty for none */
  body: string;
  author: string | null;
  reviewer: string | null;
  related: RelatedLink[];
  status: Status;
}

export interface NewsRecord extends NewsInput {
  id: string;
  category: string;
  updatedAt: Date;
  updatedBy: string | null;
}

/** A blog post or episode */
export interface PostInput {
  /** The post's address on the website: /blog/<slug> */
  slug: string;
  title: string;
  /** A line or two on the cards */
  excerpt: string;
  /** Optional: posts without one show under "All" only */
  categoryId: string | null;
  /** YYYY-MM-DD, optional */
  date: string | null;
  /** Video or podcast length, e.g. "1h 20m": cards then show a play icon */
  duration: string | null;
  /** Media storage key of the photo; a live post needs one */
  imageKey: string | null;
  /** The post, in Markdown */
  body: string;
  status: Status;
}

export interface PostRecord extends PostInput {
  id: string;
  category: string | null;
  sortOrder: number;
  updatedAt: Date;
  updatedBy: string | null;
}

/** Paths of news stories and blog posts on the website */
export const newsPath = (slug: string) => `/news/${slug}`;
export const postPath = (slug: string) => `/blog/${slug}`;

/** "NELFUND opens a portal!" → "nelfund-opens-a-portal" */
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Photos for news and blog: types the browser may upload, and the size limits */
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Narrower photos look soft on the blog's full-width header */
export const MIN_IMAGE_WIDTH = 1200;
/** Wider photos are scaled down to this before upload */
export const MAX_IMAGE_WIDTH = 2400;
/** Where news and blog photos go in media storage */
export const IMAGE_KEY_PATTERN = /^website\/(news|blog)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Where the website stands: content changed after the last publish means there's something to publish */
export interface PublishState {
  changedAt: Date | null;
  changedBy: string | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  publishError: string | null;
}

export const hasUnpublishedChanges = (s: PublishState) =>
  s.changedAt !== null && (s.publishedAt === null || s.changedAt > s.publishedAt);

export type Result = { ok: true } | { ok: false; error: string };
