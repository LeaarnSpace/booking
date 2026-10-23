// In-memory storage for tests. Signed URLs are served by `handleRequest`, so upload flows can be tested end to end.
import { createSelfServedStorage, type Backend } from "./self-served.ts";
import type { SelfServedStorage } from "./types.ts";

export interface MemoryStorageOptions {
  bucket?: string;
  baseUrl?: string;
  secret?: string;
  publicRead?: boolean;
  now?: () => number;
}

export function createMemoryStorage(options: MemoryStorageOptions = {}): SelfServedStorage {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string; lastModified: Date }>();
  const backend: Backend = {
    async read(key) {
      return objects.get(key) ?? null;
    },
    async write(key, bytes, contentType) {
      objects.set(key, { bytes: bytes.slice(), contentType, lastModified: new Date(options.now?.() ?? Date.now()) });
    },
    async remove(key) {
      objects.delete(key);
    },
  };
  return createSelfServedStorage({
    driver: "memory",
    bucket: options.bucket ?? "test",
    baseUrl: options.baseUrl ?? "http://storage.test",
    secret: options.secret ?? "memory-storage-test-secret",
    publicRead: options.publicRead,
    now: options.now,
    backend,
  });
}
