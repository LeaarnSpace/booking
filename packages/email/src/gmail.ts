// Gmail API through Google Workspace: no cost beyond Workspace itself, up to 2,000 messages a day per sending
// mailbox. A service account with domain-wide delegation (scope gmail.send only) sends as `sender`, a real
// Workspace user; `from` may be that user or one of its "Send mail as" aliases. Uses fetch and Web Crypto only
// (no Google SDK), so it runs on Workers too.
// https://developers.google.com/workspace/gmail/api/guides/sending
import { EmailError, errorFromStatus, validate } from "./errors.ts";
import type { Address, EmailMessage, EmailSender } from "./types.ts";

export interface GmailOptions {
  /** The service account's client_email */
  clientEmail: string;
  /** The service account's private_key (PEM). "\n" written as two characters is accepted too. */
  privateKey: string;
  /** The Workspace mailbox to send as, e.g. info@learnspace.com.ng */
  sender: string;
  /** Tests point these elsewhere */
  tokenUrl?: string;
  apiUrl?: string;
  fetch?: typeof fetch;
}

const SCOPE = "https://www.googleapis.com/auth/gmail.send";

const encoder = new TextEncoder();

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
const base64Url = (bytes: Uint8Array) => base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const utf8 = (s: string) => encoder.encode(s);

/** A header value that may contain non-ASCII text (RFC 2047) */
const word = (s: string) => {
  const clean = s.replace(/[\r\n]+/g, " ");
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${base64(utf8(clean))}?=`;
};
const address = (a: Address) => {
  if (!a.name) return a.email;
  const name = a.name.replace(/["\\\r\n]/g, "");
  return `${/^[\x20-\x7e]*$/.test(name) ? `"${name}"` : word(name)} <${a.email}>`;
};
/** Base64 body, wrapped at 76 characters as MIME requires */
const wrapped = (s: string) => base64(utf8(s)).replace(/.{76}/g, "$&\r\n");

/** The message in MIME format, with plain-text and HTML versions */
export function toMime(message: EmailMessage) {
  const boundary = `ls-${crypto.randomUUID()}`;
  const headers = [
    `From: ${address(message.from)}`,
    `To: ${message.to.map(address).join(", ")}`,
    ...(message.replyTo ? [`Reply-To: ${address(message.replyTo)}`] : []),
    `Subject: ${word(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) => [
    `--${boundary}`,
    `Content-Type: ${type}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
    "",
    wrapped(body),
  ];
  return [
    ...headers,
    "",
    ...part("text/plain", message.text),
    ...part("text/html", message.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function importKey(pem: string) {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  let der: Uint8Array<ArrayBuffer>;
  try {
    der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  } catch (cause) {
    throw new EmailError("config", "Gmail: the private key isn't valid PEM", { cause });
  }
  try {
    return await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  } catch (cause) {
    throw new EmailError("config", "Gmail: the private key couldn't be read", { cause });
  }
}

export function createGmailSender(options: GmailOptions): EmailSender {
  if (!options.clientEmail || !options.privateKey || !options.sender) {
    throw new EmailError("config", "Gmail needs the service account email, its private key and the sender mailbox");
  }
  const tokenUrl = options.tokenUrl ?? "https://oauth2.googleapis.com/token";
  const apiUrl = options.apiUrl ?? "https://gmail.googleapis.com";
  const doFetch = options.fetch ?? fetch;
  let key: Promise<CryptoKey> | undefined;
  let token: { value: string; expiresAt: number } | undefined;

  /** An access token for the sender mailbox, reused until a minute before it expires */
  async function accessToken() {
    if (token && token.expiresAt - 60_000 > Date.now()) return token.value;
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const claims = base64Url(
      utf8(
        JSON.stringify({
          iss: options.clientEmail,
          sub: options.sender,
          scope: SCOPE,
          aud: tokenUrl,
          iat: now,
          exp: now + 3600,
        }),
      ),
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      await (key ??= importKey(options.privateKey)),
      utf8(`${header}.${claims}`),
    );
    let res: Response;
    try {
      res = await doFetch(tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${header}.${claims}.${base64Url(new Uint8Array(signature))}`,
        }),
      });
    } catch (cause) {
      throw new EmailError("unavailable", "Couldn't reach Google", { cause });
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // A bad key, or delegation not set up for this scope or mailbox: settings, not a passing fault
      if (res.status === 400 || res.status === 401)
        throw new EmailError("unauthorized", `Google refused the service account: ${detail}`);
      throw errorFromStatus(res.status, detail);
    }
    const body = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return token.value;
  }

  return {
    driver: "gmail",
    async send(message: EmailMessage) {
      validate(message);
      const raw = base64Url(utf8(toMime(message)));
      let res: Response;
      try {
        res = await doFetch(`${apiUrl}/gmail/v1/users/${encodeURIComponent(options.sender)}/messages/send`, {
          method: "POST",
          headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
          body: JSON.stringify({ raw }),
        });
      } catch (cause) {
        if (cause instanceof EmailError) throw cause;
        throw new EmailError("unavailable", "Couldn't reach Gmail", { cause });
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        if (res.status === 401) token = undefined;
        // Gmail reports its sending limits as 403 as well as 429
        if (res.status === 403 && /rateLimitExceeded|dailyLimitExceeded|quota/i.test(detail)) {
          throw new EmailError("rate_limited", `Gmail sending limit: ${detail}`);
        }
        throw errorFromStatus(res.status, detail);
      }
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      return { id: body.id ?? null };
    },
  };
}
