// The sign-in code email.
import { esc, type Brand } from "./brand.ts";
import { button, C, FONT, layout, textBody } from "./layout.ts";

export function signInCodeEmail({
  brand,
  code,
  email,
  expiresInMinutes = 10,
  signInUrl,
}: {
  brand: Brand;
  code: string;
  email: string;
  expiresInMinutes?: number;
  /** A link that signs them in with this code in one tap, for reading the email on the same phone */
  signInUrl?: string;
}) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const subject = `${spaced} is your ${brand.name} sign-in code`;

  const text = textBody(brand, [
    `Your ${brand.name} sign-in code is ${spaced}`,
    "",
    `Enter it to continue. It expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    ...(signInUrl ? [`Or sign in with this link: ${signInUrl}`, ""] : []),
    `This code was requested for ${email}. If that wasn't you, ignore this email: no one can sign in without it. Don't forward it; we'll never ask you for the code by phone or message.`,
  ]);

  const digits = code
    .split("")
    .map(
      (d, i) =>
        `<td style="padding:0 ${i === 2 ? "10px" : i === 5 ? "0" : "3px"} 0 0"><div style="width:40px;height:52px;line-height:52px;border-radius:10px;background:${C.white};border:1px solid ${C.line};font-family:${FONT};font-size:26px;font-weight:700;color:${C.ink};text-align:center">${esc(d)}</div></td>`,
    )
    .join("");

  const html = layout({
    brand,
    subject,
    preview: `Your code is ${spaced}. It expires in ${expiresInMinutes} minutes.`,
    body: `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${C.ink}">Your sign-in code</h1>
        <p style="margin:0 0 28px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted}">${signInUrl ? "Enter this code, or tap the button below." : "Enter this code to continue."}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:${brand.colors.accentTint};border-radius:14px;width:100%">
          <tr><td align="center" style="padding:24px 8px">
            <table role="presentation" cellpadding="0" cellspacing="0" aria-label="Code ${spaced}"><tr>${digits}</tr></table>
          </td></tr>
        </table>
        <!-- Emails can't run a copy button, and the boxes copy as separate digits: one unbroken run copies whole -->
        <p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};text-align:center">Code to copy: <strong style="font-size:16px;letter-spacing:2px;color:${C.ink}">${esc(code)}</strong></p>
        <p style="margin:20px 0 ${signInUrl ? "24px" : "0"};font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};text-align:center">Expires in <strong style="color:${C.ink}">${expiresInMinutes} minutes</strong> · can only be used once</p>
        ${signInUrl ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">${button(brand, `Sign in to ${brand.name}`, signInUrl)}</td></tr></table>` : ""}`,
    footnote: `This code was requested for <strong style="color:${C.ink}">${esc(email)}</strong>. If that wasn't you, ignore this email: no one can sign in without it. Don't forward it; we'll never ask you for the code by phone or message.`,
  });

  return { subject, text, html };
}
