CREATE TYPE "website"."status" AS ENUM('live', 'draft');--> statement-breakpoint
CREATE TABLE "website"."news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category_id" uuid NOT NULL,
	"date" date NOT NULL,
	"image_key" text,
	"source" text,
	"source_url" text,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author" text,
	"reviewer" text,
	"related" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "website"."status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "website"."post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"date" date,
	"duration" text,
	"image_key" text,
	"body" text DEFAULT '' NOT NULL,
	"status" "website"."status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "website"."news" ADD CONSTRAINT "news_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "website"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website"."post" ADD CONSTRAINT "post_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "website"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "news_slug_idx" ON "website"."news" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "news_date_idx" ON "website"."news" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "post_slug_idx" ON "website"."post" USING btree ("slug");