// The frame every email shares (brand header, white card, footer) and the pieces templates fill it with.
// Built with tables and inline styles because email apps (Gmail, Outlook, Apple Mail) ignore most modern CSS.
import { esc, type Brand } from "./brand.ts";

export const C = { ink: "#0e1b34", muted: "#5a6b85", line: "#e4e5f0", page: "#f2f5fa", white: "#ffffff" };
export const FONT = "Manrope, 'Segoe UI', Helvetica, Arial, sans-serif";

/** The page around a message. `body` is HTML made with the helpers below; `preview` shows in the inbox list. */
export function layout({
  brand,
  subject,
  preview,
  body,
  footnote,
}: {
  brand: Brand;
  subject: string;
  preview: string;
  body: string;
  /** Small print under a line at the bottom of the card (HTML) */
  footnote?: string;
}) {
  return `<!doctype html>
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
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
      <tr><td style="background:${C.white};padding:36px 28px ${footnote ? "12px" : "32px"};${footnote ? "" : "border-radius:0 0 16px 16px"}">
        ${body}
      </td></tr>
${
  footnote
    ? `
      <!-- Footnote -->
      <tr><td style="background:${C.white};padding:24px 28px 32px;border-radius:0 0 16px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
          <tr><td style="padding-top:20px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted}">
            ${footnote}
          </td></tr>
        </table>
      </td></tr>
`
    : ""
}
      <!-- Footer -->
      <tr><td align="center" style="padding:24px 16px;font-family:${FONT};font-size:12px;line-height:18px;color:#8a95ab">
        ${esc(brand.footer)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export const heading = (text: string) =>
  `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${C.ink}">${esc(text)}</h1>`;

/** A paragraph of plain text (escaped) */
export const paragraph = (text: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted}">${esc(text)}</p>`;

/** A line of text followed by links, e.g. "Add it to your calendar: Google Calendar · Other calendars" */
export const linkLine = (brand: Brand, text: string, links: { label: string; url: string }[]) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted}">${esc(text)} ${links
    .map(
      (l) =>
        `<a href="${esc(l.url)}" style="color:${brand.colors.accent};font-weight:600;text-decoration:underline">${esc(l.label)}</a>`,
    )
    .join(" · ")}</p>`;

/** Label/value rows in a tinted box, e.g. the booking's date, place and amount */
export const details = (brand: Brand, rows: [label: string, value: string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.colors.accentTint};border-radius:14px;margin:8px 0 24px">
          <tr><td style="padding:18px 20px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
              .map(
                ([label, value]) =>
                  `<tr><td style="padding:5px 12px 5px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${C.ink}">${esc(value)}</td></tr>`,
              )
              .join("")}</table>
          </td></tr>
        </table>`;

export const button = (brand: Brand, label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td style="background:${brand.colors.accent};border-radius:10px"><a href="${esc(url)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:${C.white};text-decoration:none">${esc(label)}</a></td></tr></table>`;

/** Plain-text version: lines joined, with the footer at the end */
export const textBody = (brand: Brand, lines: (string | false | null | undefined)[]) =>
  [...lines.filter((l): l is string => typeof l === "string"), "", brand.footer].join("\n");
