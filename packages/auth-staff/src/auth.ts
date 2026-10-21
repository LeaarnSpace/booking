// Staff sign-in. Google SSO with company accounts is the only way in: no passwords, no emailed codes.
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";
import { grantEverything } from "./access";

/** Cookie names start with this, keeping staff sessions apart from any customer sessions */
export const STAFF_COOKIE_PREFIX = "ls-staff";

export interface StaffAuthOptions {
  /** Only addresses on these domains can sign in, e.g. ["learnspace.com.ng"] */
  allowedDomains: string[];
  /** These people become managers of every section the first time they sign in */
  bootstrapAdmins: string[];
  google?: { clientId: string; clientSecret: string };
  /** Framework plugins, e.g. nextCookies() */
  plugins?: BetterAuthPlugin[];
}

export function isAllowedEmail(email: string | null | undefined, allowedDomains: string[]) {
  const domain = email?.toLowerCase().split("@")[1];
  return Boolean(domain) && allowedDomains.includes(domain!);
}

export function createStaffAuth(options: StaffAuthOptions) {
  const { allowedDomains, bootstrapAdmins, google } = options;
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    advanced: { cookiePrefix: STAFF_COOKIE_PREFIX },
    socialProviders: google
      ? {
          google: {
            ...google,
            // Ask Google to show only company accounts (enforced again below)
            hd: allowedDomains[0],
            prompt: "select_account",
          },
        }
      : undefined,
    session: {
      expiresIn: 60 * 60 * 24 * 7, // a week
      updateAge: 60 * 60 * 24, // refreshed daily while in use
    },
    rateLimit: { enabled: true, window: 60, max: 100 },
    user: {
      // Runs before every account creation and sign-in: company addresses only
      validateUserInfo: ({ user }) => {
        if (!isAllowedEmail(user.email, allowedDomains)) {
          return { error: "domain_not_allowed", errorDescription: "Sign in with your Learn Space account." };
        }
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (bootstrapAdmins.includes(user.email.toLowerCase())) {
              await grantEverything(user.email, schema.sectionEnum.enumValues);
            }
          },
        },
      },
    },
    plugins: options.plugins ?? [],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
