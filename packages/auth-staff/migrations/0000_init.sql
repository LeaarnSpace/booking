-- IF NOT EXISTS: the migration history table lives in this schema, so drizzle creates it first
CREATE SCHEMA IF NOT EXISTS "backoffice";
--> statement-breakpoint
CREATE TYPE "backoffice"."role" AS ENUM('viewer', 'editor', 'manager');--> statement-breakpoint
CREATE TYPE "backoffice"."section" AS ENUM('website', 'bookings', 'projects', 'team');--> statement-breakpoint
CREATE TABLE "backoffice"."staff_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backoffice"."section_access" (
	"email" text NOT NULL,
	"section" "backoffice"."section" NOT NULL,
	"role" "backoffice"."role" NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_access_email_section_pk" PRIMARY KEY("email","section")
);
--> statement-breakpoint
CREATE TABLE "backoffice"."staff_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"staff_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "backoffice"."staff" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "backoffice"."staff_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backoffice"."staff_account" ADD CONSTRAINT "staff_account_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "backoffice"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backoffice"."staff_session" ADD CONSTRAINT "staff_session_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "backoffice"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_account_staff_idx" ON "backoffice"."staff_account" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_session_staff_idx" ON "backoffice"."staff_session" USING btree ("staff_id");