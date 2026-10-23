// The sign-in code email. Built with tables and inline styles because email apps (Gmail, Outlook,
// Apple Mail) ignore most modern CSS.
import { esc, type Brand } from "./brand.ts";

const C = { ink: "#0e1b34", muted: "#5a6b85", line: "#e4e5f0", page: "#f2f5fa", white: "#ffffff" };
const FONT = "Manrope, 'Segoe UI', Helvetica, Arial, sans-serif";

export function signInCodeEmail({
  brand,
  code,
  email,
  expiresInMinutes = 10,
}: {
  brand: Brand;
  code: string;
  email: string;
  expiresInMinutes?: number;
}) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const subject = `${spaced} is your ${brand.name} sign-in code`;

  const text = [
    `Your ${brand.name} sign-in code is ${spaced}`,
    "",
    `Enter it to continue. It expires in ${expiresInMinutes} minutes and can only be used once.`,
    "",
    `This code was requested for ${email}. If that wasn't you, you can ignore this email: no one can sign in without the code.`,
    "",
    brand.footer,
  ].join("\n");

  const digits = code
    .split("")
    .map(
      (d, i) =>
        `<td style="padding:0 ${i === 2 ? "10px" : i === 5 ? "0" : "3px"} 0 0"><div style="width:40px;height:52px;line-height:52px;border-radius:10px;background:${C.white};border:1px solid ${C.line};font-family:${FONT};font-size:26px;font-weight:700;color:${C.ink};text-align:center">${esc(d)}</div></td>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<!-- Inbox preview text -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your code is ${spaced}. It expires in ${expiresInMinutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

      <!-- Header -->
      <tr><td style="background:${brand.colors.header};border-radius:16px 16px 0 0;padding:28px 32px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:44px;height:44px;background:${brand.colors.accent};border-radius:6px;font-family:${FONT};font-size:9px;font-weight:800;line-height:10px;color:${C.white};padding:0 0 0 7px">LEARN<br>SPACE</td>
          <td style="padding-left:14px;font-family:${FONT};font-size:15px;font-weight:700;color:${C.white}">${esc(brand.name)}<br><span style="font-size:12px;font-weight:500;color:#9aa6bd">${esc(brand.product)}</span></td>
        </tr></table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:${C.white};padding:36px 28px 12px">
        <h1 style="margin:0 0 12px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${C.ink}">Your sign-in code</h1>
        <p style="margin:0 0 28px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted}">Enter this code to continue.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:${brand.colors.accentTint};border-radius:14px;width:100%">
          <tr><td align="center" style="padding:24px 8px">
            <table role="presentation" cellpadding="0" cellspacing="0" aria-label="Code ${spaced}"><tr>${digits}</tr></table>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};text-align:center">Expires in <strong style="color:${C.ink}">${expiresInMinutes} minutes</strong> · can only be used once</p>
      </td></tr>

      <!-- Safety note -->
      <tr><td style="background:${C.white};padding:24px 28px 32px;border-radius:0 0 16px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
          <tr><td style="padding-top:20px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}">
            This code was requested for <strong style="color:${C.ink}">${esc(email)}</strong>. If that wasn't you, ignore this email: no one can sign in without the code. We'll never ask you for it by phone or message.
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:24px 16px;font-family:${FONT};font-size:12px;line-height:18px;color:#8a95ab">
        ${esc(brand.footer)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
