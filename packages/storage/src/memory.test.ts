import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storageContract } from "./contract.ts";
import { createMemoryStorage } from "./memory.ts";

storageContract("memory", async () => {
  const storage = createMemoryStorage();
  return { storage, send: (url, init) => storage.handleRequest(new Request(url, init)) };
});

describe("memory: signed links", () => {
  it("expire", async () => {
    let now = Date.parse("2026-10-22T10:00:00Z");
    const storage = createMemoryStorage({ now: () => now });
    await storage.put("a/b.txt", "hi", { contentType: "text/plain" });
    const url = await storage.createDownloadUrl("a/b.txt", { expiresIn: 60 });
    assert.equal((await storage.handleRequest(new Request(url))).status, 200);
    now += 61_000;
    assert.equal((await storage.handleRequest(new Request(url))).status, 403);
  });

  it("serve public objects without a signature only when the bucket is public", async () => {
    const open = createMemoryStorage({ publicRead: true });
    const closed = createMemoryStorage();
    for (const s of [open, closed]) await s.put("rooms/a.jpg", "x", { contentType: "image/jpeg" });
    assert.equal((await open.handleRequest(new Request(open.publicUrl("rooms/a.jpg")!))).status, 200);
    assert.equal(closed.publicUrl("rooms/a.jpg"), null);
    assert.equal((await closed.handleRequest(new Request("http://storage.test/test/rooms/a.jpg"))).status, 403);
  });
});
