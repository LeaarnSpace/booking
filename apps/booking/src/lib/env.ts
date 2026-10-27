// Settings read from the environment, parsed once.
const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const minutes = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const env = {
  production: process.env.NODE_ENV === "production",
  appUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:4500",
  /** The back office, for links in Slack messages (optional) */
  backofficeUrl: process.env.BACKOFFICE_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:4400"),
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : undefined,
  /** Accounts on these domains are staff: they see staff-only spaces and book for free */
  staffDomains: list(process.env.BOOKING_STAFF_EMAIL_DOMAINS),
  /** How long a requested slot is held while the customer pays and uploads a receipt */
  holdMinutes: minutes(process.env.BOOKING_HOLD_MINUTES, 24 * 60),
  /**
   * Whether an email provider is set up. In development the server log stands in for one; in production,
   * without EMAIL_DRIVER, emailed sign-in codes are switched off and customers sign in with Google only.
   */
  email: process.env.NODE_ENV !== "production" || Boolean(process.env.EMAIL_DRIVER),
  /**
   * How many more times to try a message that failed (default 0: it's kept as failed in the back office).
   * Retries only happen when the app is sending anyway, after a later booking change; nothing runs on a schedule.
   */
  messageRetries: Math.min(Math.max(Math.trunc(Number(process.env.MESSAGE_RETRIES) || 0), 0), 7),
  /** Sender for sign-in codes and booking emails */
  mailFrom: {
    email: process.env.EMAIL_FROM_ADDRESS || "bookings@learnspace.com.ng",
    name: process.env.EMAIL_FROM_NAME || "Learn Space",
  },
  /** Where customers send the commitment fee */
  payment: {
    accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || "",
    accountName: process.env.PAYMENT_ACCOUNT_NAME || "",
    bankName: process.env.PAYMENT_BANK_NAME || "",
  },
  support: {
    email: process.env.SUPPORT_EMAIL || "info@learnspace.com.ng",
    phone: process.env.SUPPORT_PHONE || "",
    address: process.env.SUPPORT_ADDRESS || "38, Diya Street, Gbagada, Lagos",
  },
};

export const isStaffEmail = (email: string) => {
  const domain = email.toLowerCase().split("@")[1];
  return Boolean(domain) && env.staffDomains.includes(domain);
};

/**
 * The ways customers can sign in, as set up. Called by the sign-in pages, so a deployment with neither Google
 * nor email shows a clear error there rather than a page with no way in.
 */
export function signInMethods() {
  const methods = { google: Boolean(env.google), email: env.email };
  if (!methods.google && !methods.email) {
    throw new Error(
      "No sign-in method is set up: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or an email provider (EMAIL_DRIVER)",
    );
  }
  return methods;
}
