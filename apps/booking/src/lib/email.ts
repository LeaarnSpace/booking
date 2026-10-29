// Outgoing email. The provider comes from settings (see @learnspace/email/factory): Mailpit or the server log
// in development, Gmail (with Brevo as a backup) in production.
import type { EmailSender } from "@learnspace/email";
import { createEmailFromEnv } from "@learnspace/email/factory";
import { learnSpaceBrand, signInCodeEmail } from "@learnspace/email/templates";
import { env } from "./env";

// Created on first use (not at import), so builds don't need email settings
let sender: Promise<EmailSender> | undefined;
export const getSender = () => (sender ??= createEmailFromEnv(process.env, { production: env.production }));

export async function sendSignInCode(email: string, code: string) {
  const { subject, text, html } = signInCodeEmail({ brand: learnSpaceBrand, code, email });
  await (await getSender()).send({ from: env.mailFrom, to: [{ email }], subject, text, html });
}
