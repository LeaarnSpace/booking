// Staff identities and their back-office access. Everything lives in the "staff" Postgres schema,
// separate from customer accounts and from app data, so it can be moved to another database whole.
// Nothing outside this package should query these tables; use the functions in ./access.ts.
import { boolean, index, pgSchema, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const staff = pgSchema("staff");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------- Sign-in (Better Auth) ---------- */

export const user = staff.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = staff.table(
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

/** Linked sign-in providers (Google) */
export const account = staff.table(
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
    /**
     * Required by the auth library's table layout, but always empty: password sign-in is never
     * enabled (Google SSO, plus emailed codes in development only).
     */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

/** Short-lived values such as emailed sign-in codes */
export const verification = staff.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

/* ---------- Back-office access (RBAC) ---------- */

/** Areas of the back office. Each person gets a role per section. */
export const sectionEnum = staff.enum("section", ["website", "bookings", "projects", "team"]);
/** viewer: read only · editor: create and change · manager: everything, including deleting */
export const roleEnum = staff.enum("role", ["viewer", "editor", "manager"]);

export type Section = (typeof sectionEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

/**
 * Who can use which section, keyed by email so access can be granted before someone's first
 * sign-in. No row for a section means no access to it.
 */
export const sectionAccess = staff.table(
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
