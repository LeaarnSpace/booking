// The back office's sign-in, built from the staff identity package: Google SSO only.
import { createStaffAuth } from "@learnspace/auth-staff";
import { nextCookies } from "@learnspace/auth-staff/next";
import { env } from "./env";

export const auth = createStaffAuth({
  allowedDomains: env.allowedDomains,
  bootstrapAdmins: env.bootstrapAdmins,
  google: env.google,
  plugins: [nextCookies()],
});
