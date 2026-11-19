// When content last changed and when it was last published, so the back office can show whether the website is
// up to date. Publishing itself (asking the host to rebuild the website) is the back office's job.
import { sql } from "drizzle-orm";
import type { PublishState } from "./client.ts";
import { db, type WebsiteDatabase } from "./db.ts";
import { publishState } from "./schema.ts";

type Tx = Parameters<Parameters<WebsiteDatabase["transaction"]>[0]>[0];

const ROW = "website";

export async function getPublishState(): Promise<PublishState> {
  const [row] = await db.select().from(publishState).limit(1);
  return {
    changedAt: row?.changedAt ?? null,
    changedBy: row?.changedBy ?? null,
    publishedAt: row?.publishedAt ?? null,
    publishedBy: row?.publishedBy ?? null,
    publishError: row?.publishError ?? null,
  };
}

/** Records a change, inside the transaction that makes it */
export async function contentChanged(tx: Tx | WebsiteDatabase, by: string) {
  await tx
    .insert(publishState)
    .values({ id: ROW, changedAt: sql`now()`, changedBy: by })
    .onConflictDoUpdate({ target: publishState.id, set: { changedAt: sql`now()`, changedBy: by } });
}

/** The website's rebuild started (`error` null) or couldn't be started */
export async function recordPublish(by: string, error: string | null) {
  const set = error ? { publishError: error } : { publishedAt: sql`now()`, publishedBy: by, publishError: null };
  await db
    .insert(publishState)
    .values({ id: ROW, ...set })
    .onConflictDoUpdate({ target: publishState.id, set });
}
