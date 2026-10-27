CREATE TABLE "booking"."message_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking"."outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "outbox_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "booking"."outbox" USING btree ("next_attempt_at") WHERE "booking"."outbox"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "outbox_created_idx" ON "booking"."outbox" USING btree ("created_at");