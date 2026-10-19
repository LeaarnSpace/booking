import { defineConfig } from "drizzle-kit";

// Migrations need a direct (unpooled) connection: schema changes don't work reliably through a
// transaction pooler. The running apps use the pooled URL instead (see src/db.ts).
const url =
  process.env.STAFF_DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.STAFF_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgres://postgres@localhost:5432/learnspace";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Only the staff schema, and its migration history kept inside it, so it can move as one piece
  schemaFilter: ["staff"],
  migrations: { schema: "staff", table: "__migrations" },
  dbCredentials: { url },
});
