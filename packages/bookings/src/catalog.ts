// Spaces, their services and add-ons, as the booking app shows them. Staff-only spaces are left out
// unless the viewer is staff.
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "./db.ts";
import { addOn, lengthDiscount, service, space } from "./schema.ts";
import { includedForServices, includedForSpaces } from "./included.ts";
import type { AddOn, LengthDiscount, Service, Space } from "./types.ts";

type SpaceRow = typeof space.$inferSelect;
type DiscountRow = LengthDiscount & { spaceId: string };
type ServiceRow = typeof service.$inferSelect;

export interface SpaceWithOptions extends Space {
  services: Service[];
  addOns: AddOn[];
  /** Cheapest hourly rate: the cheapest service, or the space's own rate when it has none */
  fromRate: number;
}

export interface Viewer {
  /** Staff see staff-only spaces and book for free */
  isStaff: boolean;
}

async function withOptions(
  spaces: SpaceRow[],
  serviceRows: ServiceRow[],
  addOns: AddOn[],
  discounts: DiscountRow[],
): Promise<SpaceWithOptions[]> {
  const [spaceItems, serviceItems] = await Promise.all([
    includedForSpaces(spaces.map((s) => s.id)),
    includedForServices(serviceRows.map((s) => s.id)),
  ]);
  const services: Service[] = serviceRows.map((s) => ({ ...s, included: serviceItems.get(s.id) ?? [] }));
  return spaces.map((s) => {
    const own = services.filter((x) => x.spaceId === s.id);
    return {
      ...s,
      included: spaceItems.get(s.id) ?? [],
      discounts: discounts
        .filter((d) => d.spaceId === s.id)
        .map(({ hours, percent }) => ({ hours, percent }))
        .sort((a, b) => a.hours - b.hours),
      services: own,
      addOns: addOns.filter((a) => a.spaceId === s.id),
      fromRate: own.length ? Math.min(...own.map((x) => x.hourlyRate)) : s.hourlyRate,
    };
  });
}

export async function listSpaces(viewer: Viewer): Promise<SpaceWithOptions[]> {
  const spaces = await db
    .select()
    .from(space)
    .where(viewer.isStaff ? undefined : eq(space.visibility, "everyone"))
    .orderBy(asc(space.sortOrder), asc(space.name));
  if (!spaces.length) return [];
  const ids = spaces.map((s) => s.id);
  const [services, addOns, discounts] = await Promise.all([
    db
      .select()
      .from(service)
      .where(and(inArray(service.spaceId, ids), eq(service.active, true)))
      .orderBy(asc(service.sortOrder), asc(service.name)),
    db
      .select()
      .from(addOn)
      .where(and(inArray(addOn.spaceId, ids), eq(addOn.active, true)))
      .orderBy(asc(addOn.sortOrder), asc(addOn.name)),
    db.select().from(lengthDiscount).where(inArray(lengthDiscount.spaceId, ids)),
  ]);
  return withOptions(spaces, services, addOns, discounts);
}

export async function getSpace(id: string, viewer: Viewer): Promise<SpaceWithOptions | null> {
  const [found] = await db.select().from(space).where(eq(space.id, id));
  if (!found || (found.visibility === "staff" && !viewer.isStaff)) return null;
  const [services, addOns, discounts] = await Promise.all([
    db
      .select()
      .from(service)
      .where(and(eq(service.spaceId, id), eq(service.active, true)))
      .orderBy(asc(service.sortOrder), asc(service.name)),
    db
      .select()
      .from(addOn)
      .where(and(eq(addOn.spaceId, id), eq(addOn.active, true)))
      .orderBy(asc(addOn.sortOrder), asc(addOn.name)),
    db.select().from(lengthDiscount).where(eq(lengthDiscount.spaceId, id)),
  ]);
  return (await withOptions([found], services, addOns, discounts))[0];
}
