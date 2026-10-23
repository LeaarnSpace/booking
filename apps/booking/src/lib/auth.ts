// The booking app's sign-in, built from the customer identity package: Google, and a code sent by email when
// an email provider is set up.
import { createCustomerAuth } from "@learnspace/auth-customers";
import { nextCookies } from "@learnspace/auth-customers/next";
import { customerSignInStore } from "@learnspace/bookings";
import { sendSignInCode } from "./email";
import { env } from "./env";

/** Session cookies start with this, keeping them apart from back-office staff sessions */
export const COOKIE_PREFIX = "ls-book";

export const auth = createCustomerAuth({
  cookiePrefix: COOKIE_PREFIX,
  // Customers and their sign-in records live in the booking schema
  store: customerSignInStore,
  google: env.google,
  // Without an email provider, emailed codes are switched off (the endpoint doesn't exist)
  sendSignInCode: env.email ? sendSignInCode : undefined,
  plugins: [nextCookies()],
});
