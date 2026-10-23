// This package's own database connection, used while the apps run. Point it at a pooled URL in
// production (e.g. Neon's "-pooler" host); `prepare: false` below keeps it compatible with that.
// STAFF_DATABASE_POOLED_URL lets staff identities live in a different database; by default they share
// DATABASE_POOLED_URL. Migrations use the direct URL instead (see drizzle.config.ts).
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type StaffDatabase = PostgresJsDatabase<typeof schema>;

/** Local development default (Postgres on this machine, database "learnspace") */
export const LOCAL_DATABASE_URL = "postgres://postgres@localhost:5432/learnspace";

export const databaseUrl = () =>
  process.env.STAFF_DATABASE_POOLED_URL ||
  process.env.DATABASE_POOLED_URL ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_DATABASE_URL);

const globalForDb = globalThis as unknown as { learnspaceStaffDb?: StaffDatabase };

function connect(): StaffDatabase {
  const url = databaseUrl();
  if (!url) throw new Error("Set STAFF_DATABASE_POOLED_URL or DATABASE_POOLED_URL in production");
  return drizzle(postgres(url, { prepare: false }), { schema });
}

/** Connects on first use, so builds that import this module don't need a database */
export const db = new Proxy({} as StaffDatabase, {
  get(_, prop) {
    globalForDb.learnspaceStaffDb ??= connect();
    return Reflect.get(globalForDb.learnspaceStaffDb, prop, globalForDb.learnspaceStaffDb);
  },
});
