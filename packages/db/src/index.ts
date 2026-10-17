// Database client (Postgres via Drizzle). Locally this is the Docker Postgres from docker-compose.yml;
// in production, a hosted Postgres such as Neon.
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export type Database = PostgresJsDatabase<typeof schema>;

/** Matches docker-compose.yml, so local development works with no settings */
export const LOCAL_DATABASE_URL = "postgres://learnspace:learnspace@localhost:5433/learnspace";

function connect(): Database {
  const url = process.env.DATABASE_URL || LOCAL_DATABASE_URL;
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in production");
  }
  return drizzle(postgres(url, { prepare: false }), { schema });
}

// One pool per process, reused across hot reloads in development
const globalForDb = globalThis as unknown as { learnspaceDb?: Database };

/**
 * The database. Connects on first use rather than on import, so builds (which import this module
 * but never query it) don't need DATABASE_URL.
 */
export const db = new Proxy({} as Database, {
  get(_, prop) {
    globalForDb.learnspaceDb ??= connect();
    return Reflect.get(globalForDb.learnspaceDb, prop, globalForDb.learnspaceDb);
  },
});
