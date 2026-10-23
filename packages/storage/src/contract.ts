// The tests every storage adapter must pass. Each adapter's test file runs these against its own setup.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StorageError } from "./errors.ts";
import type { ObjectStorage } from "./types.ts";

export interface ContractSetup {
  storage: ObjectStorage;
  /** Sends a request to a URL the adapter made (fetch for real providers, handleRequest for self-served ones) */
  send(url: string, init?: RequestInit): Promise<Response>;
}

export function storageContract(name: string, setup: () => Promise<ContractSetup>) {
  const unique = () => `contract/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const text = (s: string) => new TextEncoder().encode(s);

  describe(`${name}: ObjectStorage contract`, () => {
    it("puts, reads, describes and deletes an object", async () => {
      const { storage } = await setup();
      const key = `${unique()}/hello.txt`;
      await storage.put(key, "hello", { contentType: "text/plain" });

      const head = await storage.head(key);
      assert.equal(head?.key, key);
      assert.equal(head?.size, 5);
      assert.match(head?.contentType ?? "", /^text\/plain/);

      const got = await storage.get(key);
      assert.equal(new TextDecoder().decode(got?.bytes), "hello");

      await storage.delete(key);
      assert.equal(await storage.head(key), null);
      assert.equal(await storage.get(key), null);
    });

    it("treats deleting a missing object as success", async () => {
      const { storage } = await setup();
      await storage.delete(`${unique()}/missing.txt`);
    });

    it("accepts an upload that matches its signed URL", async () => {
      const { storage, send } = await setup();
      const key = `${unique()}/photo.jpg`;
      const body = text("not really a jpeg");
      const upload = await storage.createUploadUrl(key, { contentType: "image/jpeg", size: body.length });
      assert.equal(upload.method, "PUT");
      assert.ok(upload.expiresAt.getTime() > Date.now());

      const res = await send(upload.url, { method: "PUT", headers: upload.headers, body });
      assert.ok(res.ok, `upload failed with ${res.status}`);
      const head = await storage.head(key);
      assert.equal(head?.size, body.length);
      assert.equal(head?.contentType, "image/jpeg");
      await storage.delete(key);
    });

    it("rejects an upload with a different content type", async () => {
      const { storage, send } = await setup();
      const key = `${unique()}/photo.jpg`;
      const body = text("<html>");
      const upload = await storage.createUploadUrl(key, { contentType: "image/jpeg", size: body.length });
      const res = await send(upload.url, { method: "PUT", headers: { "content-type": "text/html" }, body });
      assert.equal(res.ok, false);
      assert.equal(await storage.head(key), null);
    });

    it("rejects an upload of a different size", async () => {
      const { storage, send } = await setup();
      const key = `${unique()}/photo.jpg`;
      const upload = await storage.createUploadUrl(key, { contentType: "image/jpeg", size: 4 });
      const res = await send(upload.url, { method: "PUT", headers: upload.headers, body: text("much bigger body") });
      assert.equal(res.ok, false);
      assert.equal(await storage.head(key), null);
    });

    it("serves an object through a signed download URL", async () => {
      const { storage, send } = await setup();
      const key = `${unique()}/receipt.pdf`;
      await storage.put(key, "%PDF-1.4", { contentType: "application/pdf" });
      const res = await send(await storage.createDownloadUrl(key, { downloadName: "receipt.pdf" }));
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "%PDF-1.4");
      assert.match(res.headers.get("content-disposition") ?? "", /attachment/);
      await storage.delete(key);
    });

    it("refuses a tampered download URL", async () => {
      const { storage, send } = await setup();
      const key = `${unique()}/secret.txt`;
      await storage.put(key, "secret", { contentType: "text/plain" });
      const url = await storage.createDownloadUrl(key);
      assert.equal((await send(url.replace("secret.txt", "secreT.txt"))).ok, false);
      await storage.delete(key);
    });

    it("rejects unsafe keys with a non-retryable StorageError", async () => {
      const { storage } = await setup();
      for (const key of ["../escape", "/leading-slash", "a//b", "has space", ""]) {
        await assert.rejects(storage.head(key), (error: unknown) => {
          assert.ok(error instanceof StorageError, `${JSON.stringify(key)} should throw a StorageError`);
          assert.equal(error.code, "invalid");
          assert.equal(error.retryable, false);
          return true;
        });
      }
    });
  });
}
