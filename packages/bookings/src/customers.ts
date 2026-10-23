// Booking-app customers: reading and updating accounts, for the booking app's profile and the back office.
// Signing in is handled by packages/auth-customers, which uses `customerSignInStore` below.
import { asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "./db.ts";
import { customer, customerAccount, customerRateLimit, customerSession, customerVerification } from "./schema.ts";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: Date;
}

const columns = {
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  image: customer.image,
  createdAt: customer.createdAt,
};

export async function getCustomer(id: string): Promise<Customer | null> {
  const [row] = await db.select(columns).from(customer).where(eq(customer.id, id));
  return row ?? null;
}

export async function getCustomers(ids: string[]): Promise<Customer[]> {
  if (!ids.length) return [];
  return db.select(columns).from(customer).where(inArray(customer.id, ids));
}

export async function listCustomers(q?: string): Promise<Customer[]> {
  const query = q?.trim();
  return db
    .select(columns)
    .from(customer)
    .where(query ? or(ilike(customer.name, `%${query}%`), ilike(customer.email, `%${query}%`)) : undefined)
    .orderBy(asc(customer.name));
}

export async function countCustomers() {
  const [row] = await db.select({ n: count() }).from(customer);
  return row?.n ?? 0;
}

export async function updateCustomer(id: string, changes: { name?: string; phone?: string | null }) {
  await db.update(customer).set(changes).where(eq(customer.id, id));
}

/**
 * The database and tables customer sign-in uses, for createCustomerAuth. Keys are the sign-in library's names
 * for them ("user" is our customer).
 */
export const customerSignInStore = {
  db,
  tables: {
    user: customer,
    session: customerSession,
    account: customerAccount,
    verification: customerVerification,
    rateLimit: customerRateLimit,
  },
};
