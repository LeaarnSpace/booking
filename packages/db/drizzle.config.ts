import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Same default as src/index.ts (local Postgres)
  dbCredentials: { url: process.env.DATABASE_URL || "postgres://postgres@localhost:5432/learnspace" },
});
