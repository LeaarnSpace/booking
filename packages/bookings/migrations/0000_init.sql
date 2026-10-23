-- IF NOT EXISTS: the migration history table lives in this schema, so drizzle creates it first
CREATE SCHEMA IF NOT EXISTS "booking";
--> statement-breakpoint
CREATE TYPE "booking"."booking_kind" AS ENUM('user', 'staff');--> statement-breakpoint
CREATE TYPE "booking"."booking_status" AS ENUM('hold', 'pending', 'confirmed', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "booking"."channel" AS ENUM('app', 'phone', 'walk-in');--> statement-breakpoint
CREATE TYPE "booking"."visibility" AS ENUM('everyone', 'staff');--> statement-breakpoint
CREATE TABLE "booking"."add_on" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."booking_add_on" (
	"booking_ref" text NOT NULL,
	"add_on_id" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "booking_add_on_booking_ref_add_on_id_pk" PRIMARY KEY("booking_ref","add_on_id"),
	CONSTRAINT "booking_add_on_quantity" CHECK ("booking"."booking_add_on"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "booking"."booking_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_ref" text NOT NULL,
	"from" text NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."booking" (
	"ref" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"space_id" text NOT NULL,
	"service_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "booking"."booking_status" NOT NULL,
	"kind" "booking"."booking_kind" NOT NULL,
	"channel" "booking"."channel" DEFAULT 'app' NOT NULL,
	"created_by" text,
	"attendees" integer DEFAULT 1 NOT NULL,
	"attendee_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"purpose" text DEFAULT '' NOT NULL,
	"price" jsonb NOT NULL,
	"amount" integer NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"receipt" jsonb,
	"decision" jsonb,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_time_order" CHECK ("booking"."booking"."ends_at" > "booking"."booking"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "booking"."customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "booking"."customer_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"customer_id" text NOT NULL,
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
CREATE TABLE "booking"."customer_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "customer_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "booking"."customer_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "booking"."customer_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."included_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "included_item_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "booking"."length_discount" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"hours" integer NOT NULL,
	"percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "length_discount_space_hours" UNIQUE("space_id","hours"),
	CONSTRAINT "length_discount_hours" CHECK ("booking"."length_discount"."hours" >= 1),
	CONSTRAINT "length_discount_percent" CHECK ("booking"."length_discount"."percent" between 1 and 90)
);
--> statement-breakpoint
CREATE TABLE "booking"."notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"booking_ref" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."notification_settings" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"confirmations" boolean DEFAULT true NOT NULL,
	"reminders" boolean DEFAULT true NOT NULL,
	"cancellations" boolean DEFAULT true NOT NULL,
	"payment_updates" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."service" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"hourly_rate" integer NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."service_included_item" (
	"service_id" text NOT NULL,
	"item_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "service_included_item_service_id_item_id_pk" PRIMARY KEY("service_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "booking"."space" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"capacity" integer NOT NULL,
	"hourly_rate" integer NOT NULL,
	"visibility" "booking"."visibility" DEFAULT 'staff' NOT NULL,
	"hours" jsonb NOT NULL,
	"closed_dates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"closed_on_public_holidays" boolean DEFAULT true NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_hours" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."space_included_item" (
	"space_id" text NOT NULL,
	"item_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "space_included_item_space_id_item_id_pk" PRIMARY KEY("space_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "booking"."add_on" ADD CONSTRAINT "add_on_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "booking"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking_add_on" ADD CONSTRAINT "booking_add_on_booking_ref_booking_ref_fk" FOREIGN KEY ("booking_ref") REFERENCES "booking"."booking"("ref") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking_add_on" ADD CONSTRAINT "booking_add_on_add_on_id_add_on_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "booking"."add_on"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking_message" ADD CONSTRAINT "booking_message_booking_ref_booking_ref_fk" FOREIGN KEY ("booking_ref") REFERENCES "booking"."booking"("ref") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking" ADD CONSTRAINT "booking_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "booking"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking" ADD CONSTRAINT "booking_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "booking"."space"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."booking" ADD CONSTRAINT "booking_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "booking"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."customer_account" ADD CONSTRAINT "customer_account_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "booking"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."customer_session" ADD CONSTRAINT "customer_session_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "booking"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."length_discount" ADD CONSTRAINT "length_discount_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "booking"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."notification" ADD CONSTRAINT "notification_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "booking"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."notification" ADD CONSTRAINT "notification_booking_ref_booking_ref_fk" FOREIGN KEY ("booking_ref") REFERENCES "booking"."booking"("ref") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."notification_settings" ADD CONSTRAINT "notification_settings_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "booking"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."service" ADD CONSTRAINT "service_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "booking"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."service_included_item" ADD CONSTRAINT "service_included_item_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "booking"."service"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."service_included_item" ADD CONSTRAINT "service_included_item_item_id_included_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "booking"."included_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."space_included_item" ADD CONSTRAINT "space_included_item_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "booking"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking"."space_included_item" ADD CONSTRAINT "space_included_item_item_id_included_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "booking"."included_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "add_on_space_idx" ON "booking"."add_on" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "booking_message_booking_idx" ON "booking"."booking_message" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "booking_customer_idx" ON "booking"."booking" USING btree ("customer_id","starts_at");--> statement-breakpoint
CREATE INDEX "booking_space_time_idx" ON "booking"."booking" USING btree ("space_id","starts_at");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "booking"."booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_account_customer_idx" ON "booking"."customer_account" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_session_customer_idx" ON "booking"."customer_session" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_verification_identifier_idx" ON "booking"."customer_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "notification_customer_idx" ON "booking"."notification" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "service_space_idx" ON "booking"."service" USING btree ("space_id");
--> statement-breakpoint
-- No two active bookings of the same space may overlap. Holds, pending reviews and confirmed bookings all
-- keep their slot; declined, cancelled and expired ones free it. Ranges are half-open, so 09:00-10:00 and
-- 10:00-11:00 don't clash. btree_gist lets the "same space" (=) check share the GiST index with the range.
-- Drizzle can't describe exclusion constraints, so this part is written by hand. The extension's helper
-- functions go in their own "extensions" schema rather than cluttering "public".
CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
--> statement-breakpoint
ALTER TABLE "booking"."booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("space_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('hold', 'pending', 'confirmed'));
