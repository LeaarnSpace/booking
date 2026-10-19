// Outgoing email. In development this goes to Mailpit (http://localhost:8025), so nothing is
// really sent.
import nodemailer from "nodemailer";
import { signInCodeEmail } from "@/emails/sign-in-code";
import { env } from "./env";

const transport = nodemailer.createTransport(env.smtpUrl);

export async function sendSignInCode(email: string, code: string) {
  const { subject, text, html } = signInCodeEmail({ code, email });
  await transport.sendMail({ from: env.mailFrom, to: email, subject, text, html });
}
