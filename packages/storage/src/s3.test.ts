// Runs the contract against a real S3-compatible bucket when STORAGE_TEST_S3_* is set, e.g. a throwaway R2
// bucket. The bucket needs no CORS rules for this (requests come from Node, not a browser).
import { describe, it } from "node:test";
import { storageContract } from "./contract.ts";
import { createS3Storage } from "./s3.ts";

const env = process.env;
const configured =
  env.STORAGE_TEST_S3_ENDPOINT &&
  env.STORAGE_TEST_S3_BUCKET &&
  env.STORAGE_TEST_S3_ACCESS_KEY_ID &&
  env.STORAGE_TEST_S3_SECRET_ACCESS_KEY;

if (configured) {
  storageContract("s3", async () => ({
    storage: createS3Storage({
      endpoint: env.STORAGE_TEST_S3_ENDPOINT!,
      region: env.STORAGE_TEST_S3_REGION ?? "auto",
      bucket: env.STORAGE_TEST_S3_BUCKET!,
      accessKeyId: env.STORAGE_TEST_S3_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_TEST_S3_SECRET_ACCESS_KEY!,
    }),
    send: (url, init) => fetch(url, init),
  }));
} else {
  describe("s3", () => {
    it("contract against a real bucket", { skip: "set STORAGE_TEST_S3_* to run" }, () => {});
  });
}
