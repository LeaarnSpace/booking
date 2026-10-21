// Settings read from the environment, parsed once.
const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  allowedDomains: list(process.env.ALLOWED_EMAIL_DOMAINS),
  bootstrapAdmins: list(process.env.BOOTSTRAP_ADMIN_EMAILS),
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : undefined,
};
