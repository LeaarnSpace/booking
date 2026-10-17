// Settings read from the environment, parsed once.
const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  allowedDomains: list(process.env.ALLOWED_EMAIL_DOMAINS),
  bootstrapAdmins: list(process.env.BOOTSTRAP_ADMIN_EMAILS),
  googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  /** Email + password sign-in for local development; never enabled in production */
  devLogin: process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production",
};

/** True when the address belongs to one of the allowed company domains */
export function isAllowedEmail(email: string | undefined | null) {
  if (!email) return false;
  const domain = email.toLowerCase().split("@")[1];
  return env.allowedDomains.length > 0 && env.allowedDomains.includes(domain);
}
