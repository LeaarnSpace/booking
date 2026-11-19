CREATE TYPE "website"."employment_type" AS ENUM('Full-time', 'Part-time', 'Contract', 'Internship');--> statement-breakpoint
CREATE TYPE "website"."visibility" AS ENUM('listed', 'link', 'hidden');--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "employment_type" "website"."employment_type" DEFAULT 'Full-time' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "salary" text;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "closes_on" date;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "apply_email" text;--> statement-breakpoint
ALTER TABLE "website"."role" ADD COLUMN "visibility" "website"."visibility" DEFAULT 'hidden' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "role_code_idx" ON "website"."role" USING btree ("code");--> statement-breakpoint
-- Existing roles: shown ones become listed, hidden ones stay hidden; each gets its random page code (same letters
-- as src/code.ts; the reference to role.id makes Postgres draw a new code per row)
UPDATE "website"."role" SET
  "visibility" = CASE WHEN "hidden" THEN 'hidden'::"website"."visibility" ELSE 'listed'::"website"."visibility" END,
  "code" = (
    SELECT string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', floor(random() * 31)::int + 1, 1), '')
    FROM generate_series(1, 10) WHERE "role"."id" IS NOT NULL
  );
