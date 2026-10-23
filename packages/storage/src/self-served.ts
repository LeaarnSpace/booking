// Shared core for adapters without a cloud provider (local disk, memory). They hand out signed URLs that
// point at the app itself; the app mounts `handleRequest` on that path. Same rules as the S3 adapter:
// uploads must match the signed type and size, links expire, and private objects need a signature.
import { StorageError } from "./errors.ts";
import { assertKey, contentDisposition, uriEncode } from "./keys.ts";
import type { ObjectInfo, SelfServedStorage } from "./types.ts";

export interface Backend {
  read(key: string): Promise<{ bytes: Uint8Array; contentType: string; lastModified: Date } | null>;
  write(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface SelfServedOptions {
  driver: "local" | "memory";
  bucket: string;
  /** Where the app serves these URLs, e.g. http://localhost:4400/api/local-storage */
  baseUrl: string;
  /** Secret used to sign the URLs */
  secret: string;
  /** Anyone can read objects without a signature (for public media) */
  publicRead?: boolean;
  backend: Backend;
  now?: () => number;
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const etagOf = (info: { bytes: Uint8Array; lastModified: Date }) =>
  `"${info.bytes.length}-${info.lastModified.getTime()}"`;

export function createSelfServedStorage(options: SelfServedOptions): SelfServedStorage {
  const { bucket, backend } = options;
  const base = options.baseUrl.replace(/\/$/, "");
  const now = options.now ?? Date.now;
  const objectUrl = (key: string) => {
    assertKey(key);
    return `${base}/${uriEncode(bucket)}/${uriEncode(key, true)}`;
  };
  const payload = (op: string, key: string, expires: string, extra: string) =>
    [op, bucket, key, expires, extra].join("\n");

  async function signed(op: "get" | "put", key: string, expiresIn: number, extra: Record<string, string>) {
    const expires = String(Math.floor(now() / 1000) + expiresIn);
    const params = new URLSearchParams({ op, expires, ...extra });
    params.set("sig", await hmacHex(options.secret, payload(op, key, expires, JSON.stringify(extra))));
    return `${objectUrl(key)}?${params}`;
  }

  async function info(key: string): Promise<ObjectInfo | null> {
    assertKey(key);
    const found = await backend.read(key);
    if (!found) return null;
    return {
      key,
      size: found.bytes.length,
      contentType: found.contentType,
      etag: etagOf(found),
      lastModified: found.lastModified,
    };
  }

  const denied = (message: string) => new Response(message, { status: 403 });

  return {
    driver: options.driver,
    bucket,

    async createUploadUrl(key, { contentType, size, expiresIn = 300 }) {
      return {
        url: await signed("put", key, expiresIn, { type: contentType, size: String(size) }),
        method: "PUT",
        headers: { "content-type": contentType },
        expiresAt: new Date(now() + expiresIn * 1000),
      };
    },

    async createDownloadUrl(key, { expiresIn = 300, downloadName } = {}) {
      return signed("get", key, expiresIn, { disposition: contentDisposition(downloadName) });
    },

    publicUrl(key) {
      return options.publicRead ? objectUrl(key) : null;
    },

    head: info,

    async get(key) {
      assertKey(key);
      const found = await backend.read(key);
      if (!found) return null;
      return { bytes: found.bytes, info: (await info(key))! };
    },

    async put(key, body, { contentType }) {
      assertKey(key);
      await backend.write(key, typeof body === "string" ? encoder.encode(body) : body, contentType);
    },

    async delete(key) {
      assertKey(key);
      await backend.remove(key);
    },

    async handleRequest(request) {
      const url = new URL(request.url);
      const prefix = `${new URL(base).pathname.replace(/\/$/, "")}/${uriEncode(bucket)}/`;
      if (!url.pathname.startsWith(prefix)) return new Response("Not found", { status: 404 });
      const key = decodeURIComponent(url.pathname.slice(prefix.length));
      try {
        assertKey(key);
      } catch {
        return new Response("Not found", { status: 404 });
      }

      const op = url.searchParams.get("op");
      const expires = url.searchParams.get("expires") ?? "";
      const sig = url.searchParams.get("sig") ?? "";
      const extra: Record<string, string> = {};
      for (const [k, v] of url.searchParams) if (!["op", "expires", "sig"].includes(k)) extra[k] = v;
      const hasValidSignature = async (expected: "get" | "put") =>
        op === expected &&
        Number(expires) * 1000 > now() &&
        sameString(sig, await hmacHex(options.secret, payload(expected, key, expires, JSON.stringify(extra))));

      if (request.method === "PUT") {
        if (!(await hasValidSignature("put"))) return denied("Upload link is invalid or has expired");
        if (request.headers.get("content-type") !== extra.type) return denied("Content type doesn't match the link");
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (String(bytes.length) !== extra.size) return denied("File size doesn't match the link");
        await backend.write(key, bytes, extra.type);
        return new Response(null, { status: 200, headers: { etag: etagOf({ bytes, lastModified: new Date(now()) }) } });
      }

      if (request.method === "GET" || request.method === "HEAD") {
        const isPublic = options.publicRead && !op;
        if (!isPublic && !(await hasValidSignature("get"))) return denied("Download link is invalid or has expired");
        const found = await backend.read(key);
        if (!found) return new Response("Not found", { status: 404 });
        const headers = {
          "content-type": found.contentType,
          "content-length": String(found.bytes.length),
          "content-disposition": extra.disposition ?? "inline",
          etag: etagOf(found),
          // Uploaded files are served from the app's own origin here, so never let them run as a page. PDFs are
          // the exception: Chrome won't open its PDF viewer in a sandbox, and the viewer doesn't run page scripts.
          "x-content-type-options": "nosniff",
          ...(found.contentType === "application/pdf"
            ? {}
            : { "content-security-policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" }),
          "cache-control": isPublic ? "public, max-age=300" : "private, max-age=60",
        };
        return new Response(request.method === "HEAD" ? null : (found.bytes as BodyInit), { headers });
      }

      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD, PUT" } });
    },
  };
}

export function requireSecret(secret: string | undefined, driver: string) {
  if (!secret || secret.length < 16) {
    throw new StorageError("config", `The ${driver} storage adapter needs a signing secret of 16+ characters`);
  }
  return secret;
}
