// Object storage for the back office: private payment receipts, and room photos that the booking app
// shows publicly. The provider comes from settings (see @learnspace/storage/factory); locally, files go
// to .storage/ at the repo root (shared with the booking app) and are served by /api/local-storage.
import path from "node:path";
import type { ObjectStorage, SelfServedStorage } from "@learnspace/storage";
import { createStorageFromEnv } from "@learnspace/storage/factory";

const settings = () => ({
  ...process.env,
  STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR || path.resolve(process.cwd(), "../../.storage"),
});

const options = () => ({
  production: process.env.NODE_ENV === "production",
  localBaseUrl: `${process.env.BETTER_AUTH_URL ?? "http://localhost:4400"}/api/local-storage`,
  localSecret: process.env.BETTER_AUTH_SECRET,
});

// Created on first use (not at import), so builds don't need storage settings
let receipts: Promise<ObjectStorage> | undefined;
let media: Promise<ObjectStorage> | undefined;

/** Private bucket: customers' payment receipts, viewed through short-lived links */
export const receiptStorage = () => (receipts ??= createStorageFromEnv("RECEIPTS", settings(), options()));

/** Public bucket: room photos */
export const mediaStorage = () =>
  (media ??= createStorageFromEnv("MEDIA", settings(), { ...options(), publicRead: true }));

/** A URL to show an object: its public address when the bucket is public, otherwise a signed link */
export async function viewUrl(storage: ObjectStorage, key: string, expiresIn = 3600) {
  return storage.publicUrl(key) ?? storage.createDownloadUrl(key, { expiresIn });
}

export const isSelfServed = (storage: ObjectStorage): storage is SelfServedStorage =>
  "handleRequest" in storage && typeof storage.handleRequest === "function";
