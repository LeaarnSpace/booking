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

const allowedDomains = list(process.env.ALLOWED_EMAIL_DOMAINS);

export const env = {
  allowedDomains,
  bootstrapAdmins: list(process.env.BOOTSTRAP_ADMIN_EMAILS),
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : undefined,
  booking: {
    /** Booking-app accounts on these domains are staff: free bookings, confirmed straight away */
    staffDomains: list(process.env.BOOKING_STAFF_EMAIL_DOMAINS).length
      ? list(process.env.BOOKING_STAFF_EMAIL_DOMAINS)
      : allowedDomains,
    /** How long a requested slot is held while waiting for the payment receipt */
    holdMinutes: minutes(process.env.BOOKING_HOLD_MINUTES, 24 * 60),
    /** How much "Extend hold" adds */
    holdExtendMinutes: minutes(process.env.BOOKING_HOLD_EXTEND_MINUTES, 30),
    /** Holds this close to expiring are flagged on the bookings page */
    holdWarnMinutes: minutes(process.env.BOOKING_HOLD_WARN_MINUTES, 60),
  },
  website: {
    /** The website's address, for links to job pages */
    url: process.env.WEBSITE_URL || "https://learnspace.com.ng",
    /** Vercel deploy hook for the website project: Publish calls it to rebuild the site with the latest content */
    deployHookUrl: process.env.WEBSITE_DEPLOY_HOOK_URL || null,
    /** Shared with the website's build, which sends it to read the content; without it the endpoint is off */
    contentSecret: process.env.WEBSITE_CONTENT_SECRET || null,
  },
};
