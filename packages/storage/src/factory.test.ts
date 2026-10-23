import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StorageError } from "./errors.ts";
import { createStorageFromEnv } from "./factory.ts";

const dev = {
  production: false,
  localBaseUrl: "http://localhost/api/local-storage",
  localSecret: "a-long-enough-secret",
};
const prod = { ...dev, production: true };
const s3Env = {
  STORAGE_DRIVER: "s3",
  STORAGE_RECEIPTS_BUCKET: "receipts",
  STORAGE_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  STORAGE_S3_ACCESS_KEY_ID: "id",
  STORAGE_S3_SECRET_ACCESS_KEY: "secret",
};
const configError = (error: unknown) => error instanceof StorageError && error.code === "config";

describe("createStorageFromEnv", () => {
  it("uses local disk in development by default", async () => {
    const storage = await createStorageFromEnv("RECEIPTS", {}, dev);
    assert.equal(storage.driver, "local");
    assert.equal(storage.bucket, "receipts");
  });

  it("treats empty settings (a copied .env.example) as not set", async () => {
    const storage = await createStorageFromEnv("RECEIPTS", { STORAGE_DRIVER: "", STORAGE_RECEIPTS_BUCKET: "" }, dev);
    assert.equal(storage.driver, "local");
    assert.equal(storage.bucket, "receipts");
    await assert.rejects(createStorageFromEnv("RECEIPTS", { ...s3Env, STORAGE_S3_ENDPOINT: "" }, prod), configError);
  });

  it("builds the S3 adapter from settings", async () => {
    const storage = await createStorageFromEnv("RECEIPTS", s3Env, prod);
    assert.equal(storage.driver, "s3");
    assert.equal(storage.bucket, "receipts");
  });

  it("fails fast in production when settings are missing or unsafe", async () => {
    for (const env of [{}, { ...s3Env, STORAGE_S3_ENDPOINT: undefined }, { ...s3Env, STORAGE_DRIVER: "local" }]) {
      await assert.rejects(createStorageFromEnv("RECEIPTS", env, prod), configError);
    }
  });

  it("requires a public address for public files in production", async () => {
    const env = { ...s3Env, STORAGE_MEDIA_BUCKET: "media" };
    await assert.rejects(createStorageFromEnv("MEDIA", env, { ...prod, publicRead: true }), configError);
    const ok = await createStorageFromEnv(
      "MEDIA",
      { ...env, STORAGE_MEDIA_PUBLIC_URL: "https://media.example.com" },
      { ...prod, publicRead: true },
    );
    assert.equal(ok.publicUrl("rooms/a b.jpg"), "https://media.example.com/rooms/a%20b.jpg");
  });
});
