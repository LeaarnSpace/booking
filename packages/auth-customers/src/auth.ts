// Customer sign-in: Google, and/or a 6-digit code sent by email. No passwords. One instance per app, each with
// its own cookie name, Google project, email sender and tables. This package holds no data of its own: the app's
// data package owns the customer tables (for the booking app, the "booking" schema) and passes them in.
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

type AdapterSchema = NonNullable<NonNullable<Parameters<typeof drizzleAdapter>[1]>["schema"]>;

/** Where sign-in records live: a Drizzle database and the tables for each sign-in record */
export interface CustomerSignInStore {
  db: Parameters<typeof drizzleAdapter>[0];
  tables: Record<"user" | "session" | "account" | "verification" | "rateLimit", AdapterSchema[string]>;
}

export interface CustomerAuthOptions {
  store: CustomerSignInStore;
  /** Cookie names start with this, keeping each app's sessions apart from staff sessions, e.g. "ls-book" */
  cookiePrefix: string;
  google?: { clientId: string; clientSecret: string };
  /**
   * Delivers a sign-in code. Throw if it couldn't be sent, so the person sees an error. Leave it out when no
   * email provider is set up: emailed codes are then switched off entirely (Google only).
   */
  sendSignInCode?: (email: string, code: string) => Promise<void>;
  /** How long a code works, in minutes */
  codeMinutes?: number;
  /** Framework plugins, e.g. nextCookies() */
  plugins?: BetterAuthPlugin[];
}

export const CODE_LENGTH = 6;

/** Sign-in with a 6-digit code sent by email */
const codePlugin = (send: (email: string, code: string) => Promise<void>, codeMinutes = 10) =>
  emailOTP({
    otpLength: CODE_LENGTH,
    expiresIn: codeMinutes * 60,
    allowedAttempts: 5,
    storeOTP: "hashed",
    sendVerificationOTP: async ({ email, otp, type }) => {
      if (type !== "sign-in") return;
      await send(email, otp);
    },
  });

export function createCustomerAuth(options: CustomerAuthOptions) {
  const { sendSignInCode } = options;
  return betterAuth({
    database: drizzleAdapter(options.store.db, {
      provider: "pg",
      schema: options.store.tables,
    }),
    advanced: { cookiePrefix: options.cookiePrefix },
    socialProviders: options.google ? { google: { ...options.google, prompt: "select_account" } } : undefined,
    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: true },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 days
      updateAge: 60 * 60 * 24, // renewed daily while in use
      // A signed copy of the session in a cookie, so most page views don't need a database lookup
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        // Sign-in codes: a few per address per window, so nobody can flood an inbox
        "/email-otp/send-verification-otp": { window: 10 * 60, max: 5 },
        "/sign-in/email-otp": { window: 10 * 60, max: 10 },
      },
    },
    plugins: [...(sendSignInCode ? [codePlugin(sendSignInCode, options.codeMinutes)] : []), ...(options.plugins ?? [])],
  });
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>;
