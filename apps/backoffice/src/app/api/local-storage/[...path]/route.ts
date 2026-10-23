// Serves files for the local storage adapter in development. Every request is checked against the signed
// link (or the bucket being public), so no staff session is needed. Off unless STORAGE_DRIVER is local.
import { isSelfServed, mediaStorage, receiptStorage } from "@/lib/storage";

async function handle(request: Request) {
  for (const storage of await Promise.all([receiptStorage(), mediaStorage()])) {
    if (!isSelfServed(storage)) return new Response("Not found", { status: 404 });
    const prefix = `/api/local-storage/${storage.bucket}/`;
    if (new URL(request.url).pathname.startsWith(prefix)) return storage.handleRequest(request);
  }
  return new Response("Not found", { status: 404 });
}

export { handle as GET, handle as HEAD, handle as PUT };
