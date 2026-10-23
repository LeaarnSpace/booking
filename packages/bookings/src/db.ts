// This package's own database connection, used while the apps run. Point it at a pooled URL in production
// (e.g. Neon's "-pooler" host); `prepare: false` keeps it compatible with that. BOOKING_DATABASE_POOLED_URL lets
// booking data live in its own database; by default it shares DATABASE_POOLED_URL. Migrations use the direct URL
// instead (see drizzle.config.ts).
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type BookingDatabase = PostgresJsDatabase<typeof schema>;

/** Local development default (Postgres on this machine, database "learnspace") */
export const LOCAL_DATABASE_URL = "postgres://postgres@localhost:5432/learnspace";

export const databaseUrl = () =>
  process.env.BOOKING_DATABASE_POOLED_URL ||
  process.env.DATABASE_POOLED_URL ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_DATABASE_URL);

const globalForDb = globalThis as unknown as { learnspaceBookingDb?: BookingDatabase };

function connect(): BookingDatabase {
  const url = databaseUrl();
  if (!url) throw new Error("Set BOOKING_DATABASE_POOLED_URL or DATABASE_POOLED_URL in production");
  return drizzle(postgres(url, { prepare: false }), { schema });
}

/** Connects on first use, so builds that import this module don't need a database */
export const db = new Proxy({} as BookingDatabase, {
  get(_, prop) {
    globalForDb.learnspaceBookingDb ??= connect();
    return Reflect.get(globalForDb.learnspaceBookingDb, prop, globalForDb.learnspaceBookingDb);
  },
});
