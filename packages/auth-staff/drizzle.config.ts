import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Only the staff schema, and its migration history kept inside it, so it can move as one piece
  schemaFilter: ["staff"],
  migrations: { schema: "staff", table: "__migrations" },
  dbCredentials: {
    url: process.env.STAFF_DATABASE_URL || process.env.DATABASE_URL || "postgres://postgres@localhost:5432/learnspace",
  },
});
