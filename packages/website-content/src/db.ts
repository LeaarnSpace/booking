// This package's own database connection. Point it at a pooled URL in production (e.g. Neon's "-pooler" host);
// `prepare: false` keeps it compatible with that. WEBSITE_DATABASE_POOLED_URL lets website content live in its own
// database; by default it shares DATABASE_POOLED_URL. Migrations use the direct URL instead (see drizzle.config.ts).
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type WebsiteDatabase = PostgresJsDatabase<typeof schema>;

/** Local development default (Postgres on this machine, database "learnspace") */
export const LOCAL_DATABASE_URL = "postgres://postgres@localhost:5432/learnspace";

export const databaseUrl = () =>
  process.env.WEBSITE_DATABASE_POOLED_URL ||
  process.env.DATABASE_POOLED_URL ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_DATABASE_URL);

const globalForDb = globalThis as unknown as { learnspaceWebsiteDb?: WebsiteDatabase };

function connect(): WebsiteDatabase {
  const url = databaseUrl();
  if (!url) throw new Error("Set WEBSITE_DATABASE_POOLED_URL or DATABASE_POOLED_URL in production");
  return drizzle(postgres(url, { prepare: false }), { schema });
}

/** Connects on first use, so builds that import this module don't need a database */
export const db = new Proxy({} as WebsiteDatabase, {
  get(_, prop) {
    globalForDb.learnspaceWebsiteDb ??= connect();
    return Reflect.get(globalForDb.learnspaceWebsiteDb, prop, globalForDb.learnspaceWebsiteDb);
  },
});
