// Staff identities and their back-office access. Everything lives in the "backoffice" Postgres schema,
// separate from customer accounts and from app data, so it can be moved to another database whole.
// Nothing outside this package should query these tables; use the functions in ./access.ts.
import { boolean, index, pgSchema, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const backoffice = pgSchema("backoffice");

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------- Sign-in (Better Auth) ---------- */
// Exported under the sign-in library's names (user, session, account, verification); the tables are named
// for what they hold.

/** A staff member's back-office account */
export const user = backoffice.table("staff", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = backoffice.table(
  "staff_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("staff_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("staff_session_staff_idx").on(t.userId)],
);

/** Linked sign-in providers (Google) */
export const account = backoffice.table(
  "staff_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("staff_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Required by the auth library's table layout, but always empty: staff sign in with Google only */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("staff_account_staff_idx").on(t.userId)],
);

/** Short-lived values such as emailed sign-in codes */
export const verification = backoffice.table("staff_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

/* ---------- Back-office access (RBAC) ---------- */

/** Areas of the back office. Each person gets a role per section. */
export const sectionEnum = backoffice.enum("section", ["website", "bookings", "projects", "team"]);
/** viewer: read only · editor: create and change · manager: everything, including deleting */
export const roleEnum = backoffice.enum("role", ["viewer", "editor", "manager"]);

export type Section = (typeof sectionEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

/**
 * Who can use which section, keyed by email so access can be granted before someone's first
 * sign-in. No row for a section means no access to it.
 */
export const sectionAccess = backoffice.table(
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
