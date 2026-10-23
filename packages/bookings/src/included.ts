// "What's included" lists for spaces and services, kept in one shared list of items so the same item (e.g.
// "Headphones (per set)") can be attached to several spaces and services and renamed once.
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, type BookingDatabase } from "./db.ts";
import { includedItem, serviceIncludedItem, spaceIncludedItem } from "./schema.ts";

type Tx = Parameters<Parameters<BookingDatabase["transaction"]>[0]>[0];

/** Item names for each space, in order */
export async function includedForSpaces(ids: string[], tx: Tx | BookingDatabase = db): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>(ids.map((id) => [id, []]));
  if (!ids.length) return map;
  const rows = await tx
    .select({ id: spaceIncludedItem.spaceId, name: includedItem.name })
    .from(spaceIncludedItem)
    .innerJoin(includedItem, eq(includedItem.id, spaceIncludedItem.itemId))
    .where(inArray(spaceIncludedItem.spaceId, ids))
    .orderBy(asc(spaceIncludedItem.sortOrder), asc(includedItem.name));
  for (const r of rows) map.get(r.id)?.push(r.name);
  return map;
}

/** Item names for each service, in order */
export async function includedForServices(
  ids: string[],
  tx: Tx | BookingDatabase = db,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>(ids.map((id) => [id, []]));
  if (!ids.length) return map;
  const rows = await tx
    .select({ id: serviceIncludedItem.serviceId, name: includedItem.name })
    .from(serviceIncludedItem)
    .innerJoin(includedItem, eq(includedItem.id, serviceIncludedItem.itemId))
    .where(inArray(serviceIncludedItem.serviceId, ids))
    .orderBy(asc(serviceIncludedItem.sortOrder), asc(includedItem.name));
  for (const r of rows) map.get(r.id)?.push(r.name);
  return map;
}

/** Every item ever used, for suggestions when staff add one */
export async function listIncludedItems(): Promise<string[]> {
  const rows = await db.select({ name: includedItem.name }).from(includedItem).orderBy(asc(includedItem.name));
  return rows.map((r) => r.name);
}

/** Ids for these names, adding any that are new to the shared list */
async function itemIds(tx: Tx, names: string[]) {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!clean.length) return [];
  await tx
    .insert(includedItem)
    .values(clean.map((name) => ({ name })))
    .onConflictDoNothing();
  const rows = await tx.select().from(includedItem).where(inArray(includedItem.name, clean));
  return clean.map((name) => rows.find((r) => r.name === name)!.id);
}

/** Replaces a space's list with these names, in this order */
export async function setSpaceIncluded(tx: Tx, spaceId: string, names: string[]) {
  const ids = await itemIds(tx, names);
  await tx.delete(spaceIncludedItem).where(eq(spaceIncludedItem.spaceId, spaceId));
  if (ids.length) {
    await tx.insert(spaceIncludedItem).values(ids.map((itemId, i) => ({ spaceId, itemId, sortOrder: i + 1 })));
  }
}

/** Replaces a service's list with these names, in this order */
export async function setServiceIncluded(tx: Tx, serviceId: string, names: string[]) {
  const ids = await itemIds(tx, names);
  await tx.delete(serviceIncludedItem).where(eq(serviceIncludedItem.serviceId, serviceId));
  if (ids.length) {
    await tx.insert(serviceIncludedItem).values(ids.map((itemId, i) => ({ serviceId, itemId, sortOrder: i + 1 })));
  }
}

/** Removes items nothing uses any more, so the suggestions stay tidy */
export async function pruneIncludedItems(tx: Tx) {
  await tx.execute(sql`
    delete from ${includedItem} i
    where not exists (select 1 from ${spaceIncludedItem} s where s.item_id = i.id)
      and not exists (select 1 from ${serviceIncludedItem} v where v.item_id = i.id)
  `);
}
