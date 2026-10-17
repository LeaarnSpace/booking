// Sign-in: Google SSO for company accounts only (plus an email sign-in for local development).
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema, sectionAccess, sectionEnum } from "@learnspace/db";
import { env, isAllowedEmail } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: env.googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          // Ask Google to show only company accounts (enforced again below)
          hd: env.allowedDomains[0],
          prompt: "select_account",
        },
      }
    : undefined,
  emailAndPassword: { enabled: env.devLogin },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // a week
    updateAge: 60 * 60 * 24, // refreshed daily while in use
  },
  user: {
    // Runs before every account creation and Google sign-in: company addresses only
    validateUserInfo: ({ user }) => {
      if (!isAllowedEmail(user.email)) {
        return {
          error: "domain_not_allowed",
          errorDescription: "Sign in with your Learn Space Google account.",
        };
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        // People listed in BOOTSTRAP_ADMIN_EMAILS get full access the first time they sign in
        after: async (user) => {
          const email = user.email.toLowerCase();
          if (!env.bootstrapAdmins.includes(email)) return;
          await db
            .insert(sectionAccess)
            .values(sectionEnum.enumValues.map((section) => ({ email, section, role: "manager" as const })))
            .onConflictDoNothing();
        },
      },
    },
  },
  plugins: [nextCookies()],
});
