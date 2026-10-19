// Outgoing email. In development this goes to Mailpit (http://localhost:8025), so nothing is
// really sent.
import nodemailer from "nodemailer";
import { env } from "./env";

const transport = nodemailer.createTransport(env.smtpUrl);

export async function sendSignInCode(email: string, code: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  await transport.sendMail({
    from: env.mailFrom,
    to: email,
    subject: `${spaced} is your Learn Space sign-in code`,
    text: `Your sign-in code is ${spaced}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:Manrope,Arial,sans-serif;color:#0e1b34;max-width:480px">
      <p style="font-size:16px">Your Learn Space sign-in code is</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${spaced}</p>
      <p style="font-size:14px;color:#5a6b85">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
    </div>`,
  });
}
