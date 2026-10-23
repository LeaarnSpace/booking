import { StorageError } from "./errors.ts";

const KEY = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/** Keys are made by the app, never taken from users: letters, digits, ".", "_", "-" and "/" separators. */
export function assertKey(key: string) {
  if (
    key.length > 512 ||
    !KEY.test(key) ||
    key.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new StorageError("invalid", `Invalid storage key: ${JSON.stringify(key)}`);
  }
}

/** RFC 3986 encoding, as S3-style signatures expect. Keeps "/" when encoding a key path. */
export function uriEncode(value: string, keepSlash = false) {
  const encoded = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return keepSlash ? encoded.replace(/%2F/g, "/") : encoded;
}

/** `attachment; filename="..."` with a UTF-8 fallback, for downloads */
export function contentDisposition(downloadName: string | undefined) {
  if (!downloadName) return "inline";
  const ascii = downloadName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${uriEncode(downloadName)}`;
}
