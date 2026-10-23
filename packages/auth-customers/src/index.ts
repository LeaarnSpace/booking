// Customer sign-in (Google and emailed codes), reusable by any app. Apps pass in where the records live; the
// customer data itself (accounts, lookups) belongs to the app's data package, e.g. @learnspace/bookings.
export {
  createCustomerAuth,
  CODE_LENGTH,
  type CustomerAuth,
  type CustomerAuthOptions,
  type CustomerSignInStore,
} from "./auth";
