import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  // Same default as src/index.ts (the Docker Postgres from docker-compose.yml)
  dbCredentials: { url: process.env.DATABASE_URL || "postgres://learnspace:learnspace@localhost:5433/learnspace" },
});
