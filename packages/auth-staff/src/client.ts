// Browser-side sign-in helpers for staff apps.
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const createStaffAuthClient = () => createAuthClient({ plugins: [emailOTPClient()] });
