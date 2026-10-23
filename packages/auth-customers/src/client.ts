// Browser-side sign-in helpers for customer apps.
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const createCustomerAuthClient = () => createAuthClient({ plugins: [emailOTPClient()] });
