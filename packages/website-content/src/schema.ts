// Content for the website (learnspace.com.ng), edited in the back office and pulled by the website's build.
// Everything lives in the "website" Postgres schema; nothing outside this package queries these tables.
import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { ARRANGEMENTS, CATEGORY_KINDS, EMPLOYMENT_TYPES, STATUSES, VISIBILITIES, type RelatedLink } from "./client.ts";

export const website = pgSchema("website");

export const categoryKindEnum = website.enum("category_kind", CATEGORY_KINDS);
export const arrangementEnum = website.enum("arrangement", ARRANGEMENTS);
export const employmentTypeEnum = website.enum("employment_type", EMPLOYMENT_TYPES);
export const visibilityEnum = website.enum("visibility", VISIBILITIES);
export const statusEnum = website.enum("status", STATUSES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  /** Email of the staff member who last changed it */
  updatedBy: text("updated_by"),
};

/** Teams (for job roles) and news and blog categories, editable by staff */
export const category = website.table(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: categoryKindEnum("kind").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(100),
    ...timestamps,
  },
  // One "Research" per kind, whatever the capitals
  (t) => [uniqueIndex("category_kind_name_idx").on(t.kind, sql`lower(${t.name})`)],
);

/** Open roles on the Work With Us page, each with its own page at /work-with-us/<code> */
export const role = website.table(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Random, so a link-only role's page can't be guessed; replaced to stop an old link working */
    code: text("code").notNull(),
    title: text("title").notNull(),
    // A team in use can't be deleted
    teamId: uuid("team_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    posted: date("posted", { mode: "string" }).notNull(),
    location: text("location").notNull(),
    arrangement: arrangementEnum("arrangement").notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull().default("Full-time"),
    salary: text("salary"),
    /** e.g. "Head of Research"; shown in the job page's summary card */
    reportsTo: text("reports_to"),
    closesOn: date("closes_on", { mode: "string" }),
    summary: text("summary").notNull().default(""),
    /** Markdown */
    description: text("description").notNull().default(""),
    applyUrl: text("apply_url"),
    applyEmail: text("apply_email"),
    visibility: visibilityEnum("visibility").notNull().default("hidden"),
    sortOrder: integer("sort_order").notNull().default(100),
    ...timestamps,
  },
  (t) => [uniqueIndex("role_code_idx").on(t.code)],
);

/** News stories, each with its own page at /news/<slug> */
export const news = website.table(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // A category in use can't be deleted
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    date: date("date", { mode: "string" }).notNull(),
    /** Media storage key */
    imageKey: text("image_key"),
    source: text("source"),
    sourceUrl: text("source_url"),
    summary: text("summary").notNull().default(""),
    /** Markdown: our take on the story */
    body: text("body").notNull().default(""),
    author: text("author"),
    reviewer: text("reviewer"),
    related: jsonb("related").$type<RelatedLink[]>().notNull().default([]),
    status: statusEnum("status").notNull().default("draft"),
    ...timestamps,
  },
  (t) => [uniqueIndex("news_slug_idx").on(t.slug), index("news_date_idx").on(t.date)],
);

/** Blog posts and episodes, each with its own page at /blog/<slug> */
export const post = website.table(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "restrict" }),
    date: date("date", { mode: "string" }),
    duration: text("duration"),
    /** Media storage key */
    imageKey: text("image_key"),
    /** Markdown */
    body: text("body").notNull().default(""),
    status: statusEnum("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(100),
    ...timestamps,
  },
  (t) => [uniqueIndex("post_slug_idx").on(t.slug)],
);

/** One row: when content last changed, and when it was last sent to the website */
export const publishState = website.table("publish_state", {
  id: text("id").primaryKey().default("website"),
  changedAt: timestamp("changed_at", { withTimezone: true }),
  changedBy: text("changed_by"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: text("published_by"),
  /** Why the last publish didn't start, cleared by the next one that does */
  publishError: text("publish_error"),
});
