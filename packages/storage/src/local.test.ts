import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { storageContract } from "./contract.ts";
import { createLocalStorage } from "./local.ts";

const dirs: string[] = [];
after(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

storageContract("local", async () => {
  const dir = await mkdtemp(join(tmpdir(), "storage-test-"));
  dirs.push(dir);
  const storage = createLocalStorage({
    dir,
    bucket: "test",
    baseUrl: "http://localhost/api/local-storage",
    secret: "local-storage-test-secret",
  });
  return { storage, send: (url, init) => storage.handleRequest(new Request(url, init)) };
});
