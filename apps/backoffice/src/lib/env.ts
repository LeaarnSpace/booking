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
  /** Sign in with an emailed code: local development only, never in production */
  devEmailSignIn: process.env.DEV_EMAIL_SIGN_IN === "true" && process.env.NODE_ENV !== "production",
  /** Where outgoing email goes; defaults to Mailpit on this machine */
  smtpUrl: process.env.SMTP_URL || "smtp://localhost:1025",
  mailFrom: process.env.MAIL_FROM || "Learn Space <no-reply@learnspace.com.ng>",
};
