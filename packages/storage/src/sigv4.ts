// AWS Signature Version 4, the signing scheme S3-compatible storage uses (R2, S3, B2, MinIO...).
// Web Crypto only, so it runs in Node and in Cloudflare Workers.
import { uriEncode } from "./keys.ts";

export interface SigningCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
}

const encoder = new TextEncoder();
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

export async function sha256Hex(data: Uint8Array | string) {
  return hex(
    await crypto.subtle.digest("SHA-256", (typeof data === "string" ? encoder.encode(data) : data) as BufferSource),
  );
}

/** "20130524T000000Z" */
const amzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

function canonicalQuery(params: [string, string][]) {
  return params
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

interface Signable {
  method: string;
  /** e.g. "https://host" with no trailing slash */
  origin: string;
  /** Already URI-encoded path, e.g. "/bucket/rooms/a.jpg" */
  path: string;
  query?: [string, string][];
  /** Headers to sign; `host` is added automatically */
  headers?: Record<string, string>;
  credentials: SigningCredentials;
  date?: Date;
}

async function signature(
  s: Signable,
  datetime: string,
  query: [string, string][],
  headers: Record<string, string>,
  payloadHash: string,
) {
  const { credentials } = s;
  const service = credentials.service ?? "s3";
  const dateStamp = datetime.slice(0, 8);
  const scope = `${dateStamp}/${credentials.region}/${service}/aws4_request`;
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim().replace(/\s+/g, " ")}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [s.method, s.path, canonicalQuery(query), canonicalHeaders, signedHeaders, payloadHash].join(
    "\n",
  );
  const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, await sha256Hex(canonicalRequest)].join("\n");
  let key = await hmac(encoder.encode(`AWS4${credentials.secretAccessKey}`), dateStamp);
  key = await hmac(key, credentials.region);
  key = await hmac(key, service);
  key = await hmac(key, "aws4_request");
  return { signature: hex(await hmac(key, stringToSign)), scope, signedHeaders };
}

const lower = (headers: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

/** A URL with the signature in the query string, for handing to a browser */
export async function presign(s: Signable & { expiresIn: number }) {
  const datetime = amzDate(s.date ?? new Date());
  const headers = { host: new URL(s.origin).host, ...lower(s.headers) };
  const service = s.credentials.service ?? "s3";
  const base: [string, string][] = [
    ...(s.query ?? []),
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    [
      "X-Amz-Credential",
      `${s.credentials.accessKeyId}/${datetime.slice(0, 8)}/${s.credentials.region}/${service}/aws4_request`,
    ],
    ["X-Amz-Date", datetime],
    ["X-Amz-Expires", String(s.expiresIn)],
    ["X-Amz-SignedHeaders", Object.keys(headers).sort().join(";")],
  ];
  const { signature: sig } = await signature(s, datetime, base, headers, "UNSIGNED-PAYLOAD");
  return `${s.origin}${s.path}?${canonicalQuery([...base, ["X-Amz-Signature", sig]])}`;
}

/** Headers (including Authorization) for a server-side request */
export async function signHeaders(s: Signable & { payloadHash?: string }) {
  const datetime = amzDate(s.date ?? new Date());
  const payloadHash = s.payloadHash ?? EMPTY_SHA256;
  const headers = {
    host: new URL(s.origin).host,
    ...lower(s.headers),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": datetime,
  };
  const { signature: sig, scope, signedHeaders } = await signature(s, datetime, s.query ?? [], headers, payloadHash);
  const { host: _host, ...rest } = headers;
  return {
    ...rest,
    authorization: `AWS4-HMAC-SHA256 Credential=${s.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
  };
}
