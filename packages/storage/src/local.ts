// Files on the local disk, for development without a cloud account. Never used in production.
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createSelfServedStorage, requireSecret, type Backend } from "./self-served.ts";
import type { SelfServedStorage } from "./types.ts";

export interface LocalStorageOptions {
  /** Folder to keep files in (one subfolder per bucket) */
  dir: string;
  bucket: string;
  /** Where the app mounts `handleRequest`, e.g. http://localhost:4400/api/local-storage */
  baseUrl: string;
  secret: string;
  publicRead?: boolean;
}

export function createLocalStorage(options: LocalStorageOptions): SelfServedStorage {
  const root = resolve(options.dir, options.bucket);
  // Content types live in a parallel tree, so object keys can be anything valid
  const file = (key: string) => join(root, "objects", key);
  const meta = (key: string) => join(root, "types", `${key}.txt`);

  const backend: Backend = {
    async read(key) {
      try {
        const [bytes, contentType, info] = await Promise.all([
          readFile(file(key)),
          readFile(meta(key), "utf8"),
          stat(file(key)),
        ]);
        return { bytes: new Uint8Array(bytes), contentType, lastModified: info.mtime };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async write(key, bytes, contentType) {
      await mkdir(dirname(file(key)), { recursive: true });
      await mkdir(dirname(meta(key)), { recursive: true });
      await writeFile(file(key), bytes);
      await writeFile(meta(key), contentType);
    },
    async remove(key) {
      await Promise.all([rm(file(key), { force: true }), rm(meta(key), { force: true })]);
    },
  };

  return createSelfServedStorage({
    driver: "local",
    bucket: options.bucket,
    baseUrl: options.baseUrl,
    secret: requireSecret(options.secret, "local"),
    publicRead: options.publicRead,
    backend,
  });
}
