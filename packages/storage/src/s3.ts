// S3-compatible object storage over plain fetch: Cloudflare R2, AWS S3, Backblaze B2, MinIO and others.
// R2: endpoint https://<account id>.r2.cloudflarestorage.com, region "auto".
import { errorFromStatus, StorageError } from "./errors.ts";
import { assertKey, contentDisposition, uriEncode } from "./keys.ts";
import { presign, sha256Hex, signHeaders, type SigningCredentials } from "./sigv4.ts";
import type { ObjectInfo, ObjectStorage } from "./types.ts";

export interface S3StorageOptions {
  endpoint: string;
  /** "auto" for R2 */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** https://endpoint/bucket/key (default, works everywhere) instead of https://bucket.endpoint/key */
  pathStyle?: boolean;
  /** Public address of the bucket (e.g. an R2 custom domain), for buckets meant to be public */
  publicBaseUrl?: string;
  fetch?: typeof fetch;
}

export function createS3Storage(options: S3StorageOptions): ObjectStorage {
  const endpoint = new URL(options.endpoint);
  const pathStyle = options.pathStyle ?? true;
  const origin = pathStyle ? endpoint.origin : `${endpoint.protocol}//${options.bucket}.${endpoint.host}`;
  const credentials: SigningCredentials = {
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
  };
  const doFetch = options.fetch ?? fetch;
  const path = (key: string) => {
    assertKey(key);
    return pathStyle ? `/${uriEncode(options.bucket)}/${uriEncode(key, true)}` : `/${uriEncode(key, true)}`;
  };

  async function send(method: string, key: string, init: { body?: Uint8Array; headers?: Record<string, string> } = {}) {
    const p = path(key);
    const headers = await signHeaders({
      method,
      origin,
      path: p,
      headers: init.headers,
      credentials,
      payloadHash: init.body ? await sha256Hex(init.body) : undefined,
    });
    try {
      return await doFetch(`${origin}${p}`, { method, headers, body: init.body as BodyInit | undefined });
    } catch (cause) {
      throw new StorageError("unavailable", `${method} ${key}: could not reach storage`, { cause });
    }
  }

  const info = (key: string, res: Response): ObjectInfo => ({
    key,
    size: Number(res.headers.get("content-length") ?? 0),
    contentType: res.headers.get("content-type"),
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified") ? new Date(res.headers.get("last-modified")!) : null,
  });

  return {
    driver: "s3",
    bucket: options.bucket,

    async createUploadUrl(key, { contentType, size, expiresIn = 300 }) {
      const url = await presign({
        method: "PUT",
        origin,
        path: path(key),
        headers: { "content-type": contentType, "content-length": String(size) },
        credentials,
        expiresIn,
      });
      return {
        url,
        method: "PUT",
        headers: { "content-type": contentType },
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    },

    async createDownloadUrl(key, { expiresIn = 300, downloadName } = {}) {
      return presign({
        method: "GET",
        origin,
        path: path(key),
        query: [["response-content-disposition", contentDisposition(downloadName)]],
        credentials,
        expiresIn,
      });
    },

    publicUrl(key) {
      if (!options.publicBaseUrl) return null;
      return `${options.publicBaseUrl.replace(/\/$/, "")}/${uriEncode(key, true)}`;
    },

    async head(key) {
      const res = await send("HEAD", key);
      if (res.status === 404) return null;
      if (!res.ok) throw errorFromStatus(res.status, `HEAD ${key}`);
      return info(key, res);
    },

    async get(key) {
      const res = await send("GET", key);
      if (res.status === 404) return null;
      if (!res.ok) throw errorFromStatus(res.status, `GET ${key}`);
      return { bytes: new Uint8Array(await res.arrayBuffer()), info: info(key, res) };
    },

    async put(key, body, { contentType }) {
      const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
      const res = await send("PUT", key, { body: bytes, headers: { "content-type": contentType } });
      if (!res.ok) throw errorFromStatus(res.status, `PUT ${key}`);
    },

    async delete(key) {
      const res = await send("DELETE", key);
      if (!res.ok && res.status !== 404) throw errorFromStatus(res.status, `DELETE ${key}`);
    },
  };
}
