// Staff sign-in. Passwordless only: Google SSO for company accounts, plus (local development only)
// a 6-digit code sent by email. There is no password sign-in anywhere.
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./schema";
import { grantEverything } from "./access";

/** Cookie names start with this, keeping staff sessions apart from any customer sessions */
export const STAFF_COOKIE_PREFIX = "ls-staff";

export interface StaffAuthOptions {
  /** Only addresses on these domains can sign in, e.g. ["learnspace.ng"] */
  allowedDomains: string[];
  /** These people become managers of every section the first time they sign in */
  bootstrapAdmins: string[];
  google?: { clientId: string; clientSecret: string };
  /** Sign in with an emailed code. Pass only in local development; staff use Google in production. */
  sendSignInCode?: (email: string, code: string) => Promise<void>;
  /** Framework plugins, e.g. nextCookies() */
  plugins?: BetterAuthPlugin[];
}

export function isAllowedEmail(email: string | null | undefined, allowedDomains: string[]) {
  const domain = email?.toLowerCase().split("@")[1];
  return Boolean(domain) && allowedDomains.includes(domain!);
}

export function createStaffAuth(options: StaffAuthOptions) {
  const { allowedDomains, bootstrapAdmins, google, sendSignInCode } = options;
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
    plugins: [
      ...(sendSignInCode
        ? [
            emailOTP({
              otpLength: 6,
              expiresIn: 10 * 60,
              allowedAttempts: 3,
              storeOTP: "hashed",
              // Codes only ever go to company addresses, so this can't be used to email anyone else
              sendVerificationOTP: async ({ email, otp, type }) => {
                if (type === "sign-in" && isAllowedEmail(email, allowedDomains)) await sendSignInCode(email, otp);
              },
            }),
          ]
        : []),
      ...(options.plugins ?? []),
    ],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
