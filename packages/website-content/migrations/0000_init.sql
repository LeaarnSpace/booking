-- IF NOT EXISTS: the migration history table lives in this schema, so drizzle creates it first
CREATE SCHEMA IF NOT EXISTS "website";
--> statement-breakpoint
CREATE TYPE "website"."arrangement" AS ENUM('Remote', 'Hybrid', 'On-site');--> statement-breakpoint
CREATE TYPE "website"."category_kind" AS ENUM('team', 'news', 'blog');--> statement-breakpoint
CREATE TABLE "website"."category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "website"."category_kind" NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "website"."publish_state" (
	"id" text PRIMARY KEY DEFAULT 'website' NOT NULL,
	"changed_at" timestamp with time zone,
	"changed_by" text,
	"published_at" timestamp with time zone,
	"published_by" text,
	"publish_error" text
);
--> statement-breakpoint
CREATE TABLE "website"."role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"team_id" uuid NOT NULL,
	"posted" date NOT NULL,
	"location" text NOT NULL,
	"arrangement" "website"."arrangement" NOT NULL,
	"apply_url" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "website"."role" ADD CONSTRAINT "role_team_id_category_id_fk" FOREIGN KEY ("team_id") REFERENCES "website"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_kind_name_idx" ON "website"."category" USING btree ("kind",lower("name"));--> statement-breakpoint
-- Starting teams and categories: the ones the website used before they were editable
INSERT INTO "website"."category" ("kind", "name", "sort_order") VALUES
  ('team', 'Research', 1), ('team', 'Product', 2), ('team', 'Programmes', 3),
  ('news', 'Teachers', 1), ('news', 'Research', 2), ('news', 'Policy', 3), ('news', 'Digital', 4), ('news', 'Finance', 5),
  ('blog', 'Homes', 1), ('blog', 'Teachers', 2), ('blog', 'Students', 3), ('blog', 'Policy', 4), ('blog', 'Culture', 5);
