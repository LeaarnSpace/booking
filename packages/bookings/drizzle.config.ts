import { defineConfig } from "drizzle-kit";

// Migrations need a direct (unpooled) connection: schema changes don't work reliably through a
// transaction pooler. The running apps use the pooled URL instead (see src/db.ts).
const url =
  process.env.BOOKING_DATABASE_DIRECT_URL ||
  process.env.DATABASE_DIRECT_URL ||
  process.env.BOOKING_DATABASE_POOLED_URL ||
  process.env.DATABASE_POOLED_URL ||
  "postgres://postgres@localhost:5432/learnspace";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Only the booking schema, and its migration history kept inside it, so it can move as one piece
  schemaFilter: ["booking"],
  migrations: { schema: "booking", table: "__migrations" },
  dbCredentials: { url },
});
