// Checked against the worked examples in AWS's S3 Signature Version 4 documentation.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_SHA256, presign, signHeaders } from "./sigv4.ts";

const credentials = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
};
const date = new Date("2013-05-24T00:00:00Z");

describe("SigV4", () => {
  it("presigns a GET like the AWS example", async () => {
    const url = await presign({
      method: "GET",
      origin: "https://examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      credentials,
      date,
      expiresIn: 86400,
    });
    assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404(&|$)/);
  });

  it("signs a GET with a Range header like the AWS example", async () => {
    const headers = await signHeaders({
      method: "GET",
      origin: "https://examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      headers: { Range: "bytes=0-9" },
      credentials,
      date,
      payloadHash: EMPTY_SHA256,
    });
    assert.equal(
      headers.authorization,
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
        "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
        "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });
});
