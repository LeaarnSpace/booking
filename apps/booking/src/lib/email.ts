// Outgoing email. The provider comes from settings (see @learnspace/email/factory): Mailpit or the server log
// in development, Gmail (with Brevo as a backup) in production.
import type { SignInCodeContext } from "@learnspace/auth-customers";
import type { EmailSender } from "@learnspace/email";
import { createEmailFromEnv } from "@learnspace/email/factory";
import { learnSpaceBrand, signInCodeEmail } from "@learnspace/email/templates";
import { env } from "./env";

// Created on first use (not at import), so builds don't need email settings
let sender: Promise<EmailSender> | undefined;
export const getSender = () => (sender ??= createEmailFromEnv(process.env, { production: env.production }));

/** The email's one-tap link: a page that signs in with the code when they tap Sign in (see /login/email) */
function signInUrl(email: string, code: string, from: SignInCodeContext) {
  const url = new URL("/login/email", env.appUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("code", code);
  if (from.next && from.next !== "/") url.searchParams.set("next", from.next);
  if (from.signUp) url.searchParams.set("new", "1");
  if (from.signUp && from.name) url.searchParams.set("name", from.name);
  return url.toString();
}

export async function sendSignInCode(email: string, code: string, from: SignInCodeContext) {
  const { subject, text, html } = signInCodeEmail({
    brand: learnSpaceBrand,
    code,
    email,
    signInUrl: signInUrl(email, code, from),
  });
  await (await getSender()).send({ from: env.mailFrom, to: [{ email }], subject, text, html });
}
