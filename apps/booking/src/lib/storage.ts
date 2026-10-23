// Object storage for the booking app: customers upload payment receipts (private bucket) and see space photos
// (public bucket). The provider comes from settings (see @learnspace/storage/factory); locally, files go to
// .storage/ at the repo root (shared with the back office) and are served by /api/local-storage.
import path from "node:path";
import type { ObjectStorage, SelfServedStorage } from "@learnspace/storage";
import { createStorageFromEnv } from "@learnspace/storage/factory";
import type { Photo } from "@learnspace/bookings/client";
import { env } from "./env";

const settings = () => ({
  ...process.env,
  STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR || path.resolve(process.cwd(), "../../.storage"),
});

const options = () => ({
  production: env.production,
  localBaseUrl: `${env.appUrl}/api/local-storage`,
  localSecret: process.env.BETTER_AUTH_SECRET,
});

// Created on first use (not at import), so builds don't need storage settings
let receipts: Promise<ObjectStorage> | undefined;
let media: Promise<ObjectStorage> | undefined;

/** Private bucket: payment receipts */
export const receiptStorage = () => (receipts ??= createStorageFromEnv("RECEIPTS", settings(), options()));

/** Public bucket: space and service photos */
export const mediaStorage = () =>
  (media ??= createStorageFromEnv("MEDIA", settings(), { ...options(), publicRead: true }));

export const isSelfServed = (storage: ObjectStorage): storage is SelfServedStorage =>
  "handleRequest" in storage && typeof storage.handleRequest === "function";

export interface PhotoView {
  url: string;
  alt: string;
}

/** Public URLs for photos, in order (the first is the cover) */
export async function photoUrls(photos: Photo[]): Promise<PhotoView[]> {
  if (!photos.length) return [];
  const storage = await mediaStorage();
  return photos.map((p) => ({ url: storage.publicUrl(p.key) ?? "", alt: p.alt })).filter((p) => p.url);
}
