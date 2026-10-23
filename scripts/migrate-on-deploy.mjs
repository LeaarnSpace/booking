// Applies new database migrations during each app's build on the host (Vercel or Cloudflare), so the database
// is up to date before that app's new code goes live, whichever app changed.
//
// Both apps run this, often at the same moment, so it first takes a Postgres advisory lock: one build applies
// the new migrations while the other waits, then finds nothing left to do. (The migration tool itself takes no
// lock, so without this two builds could apply the same migration at once.)
//
// Runs only when DATABASE_DIRECT_URL is set: on the host, set it for production (Neon main branch) and for the
// staging branch (Neon staging branch) only. Other preview builds and local builds skip it.
// A failed migration fails the build, so code never deploys against a database that's behind it.
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const url = process.env.DATABASE_DIRECT_URL;
/** Any fixed number shared by every build; identifies "migrations are running" */
const LOCK_ID = 5_437_002;

if (!url) {
  console.log("Migrations skipped: DATABASE_DIRECT_URL isn't set for this build.");
  process.exit(0);
}

// Schema changes need a direct connection, and so does the lock (a pooler can hand it to someone else)
if (new URL(url).hostname.includes("-pooler")) {
  console.error("DATABASE_DIRECT_URL is a pooled address (host contains -pooler). Use Neon's direct address.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
let status = 1;
try {
  console.log("Waiting for any other build's migrations to finish…");
  await sql`select pg_advisory_lock(${LOCK_ID})`;
  console.log("Applying new database migrations…");
  status =
    spawnSync("npm", ["run", "db:migrate"], { stdio: "inherit", cwd: new URL("..", import.meta.url) }).status ?? 1;
} finally {
  // Closing the connection releases the lock too, even if something above failed
  await sql`select pg_advisory_unlock(${LOCK_ID})`.catch(() => {});
  await sql.end();
}
process.exit(status);
