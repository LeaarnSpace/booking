// The back office's sign-in, built from the staff identity package. Passwordless: Google SSO, plus
// emailed codes in local development only.
import { createStaffAuth } from "@learnspace/auth-staff";
import { nextCookies } from "@learnspace/auth-staff/next";
import { env } from "./env";
import { sendSignInCode } from "./mail";

export const auth = createStaffAuth({
  allowedDomains: env.allowedDomains,
  bootstrapAdmins: env.bootstrapAdmins,
  google: env.google,
  sendSignInCode: env.devEmailSignIn ? sendSignInCode : undefined,
  plugins: [nextCookies()],
});
