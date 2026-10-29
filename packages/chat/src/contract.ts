// The behaviour every chat adapter must share. Each adapter's test file runs this suite against it.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChatError } from "./errors.ts";
import type { ChatMessage, ChatSender } from "./types.ts";

export const sampleChat: ChatMessage = {
  title: "Receipt to review: LS-0311-4821",
  lines: ["Creative Space · Tue 3 Nov, 10:00–13:00", "₦45,000"],
  link: { label: "Review", url: "https://backoffice.example.com/bookings/LS-0311-4821" },
};

export function chatContract(name: string, setup: () => ChatSender | Promise<ChatSender>) {
  describe(`${name}: chat contract`, () => {
    it("posts a valid message", async () => {
      const sender = await setup();
      await sender.send(sampleChat);
    });

    it("rejects an empty message before posting, as invalid and not retryable", async () => {
      const sender = await setup();
      await assert.rejects(sender.send({ ...sampleChat, title: " " }), (e: unknown) => {
        assert.ok(e instanceof ChatError);
        assert.equal(e.code, "invalid");
        assert.equal(e.retryable, false);
        return true;
      });
    });
  });
}
