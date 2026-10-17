// Database tables shared by the back office (and, later, the booking platform).
// The first four tables are the ones Better Auth needs for sign-in; `sectionAccess` is our RBAC.
import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------- Sign-in (Better Auth) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    /** Only used by the local development sign-in; production uses Google only */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

/* ---------- Access control (RBAC) ---------- */

/** Areas of the back office. Each person gets a role per section. */
export const sectionEnum = pgEnum("section", ["website", "bookings", "projects", "team"]);
/** viewer: read only · editor: create and change · manager: everything, including deleting */
export const roleEnum = pgEnum("role", ["viewer", "editor", "manager"]);

export type Section = (typeof sectionEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

/**
 * Who can use which section, keyed by email so access can be granted before someone's first
 * sign-in. No row for a section means no access to it.
 */
export const sectionAccess = pgTable(
  "section_access",
  {
    email: text("email").notNull(),
    section: sectionEnum("section").notNull(),
    role: roleEnum("role").notNull(),
    grantedBy: text("granted_by"),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.email, t.section] })],
);
