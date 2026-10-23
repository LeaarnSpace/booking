// The behaviour every email adapter must share. Each adapter's test file runs this suite against it.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EmailError } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export const sampleMessage: EmailMessage = {
  from: { email: "bookings@example.com", name: "Learn Space" },
  to: [{ email: "amara@example.com", name: "Amara" }],
  subject: "Your booking is confirmed",
  text: "See you soon",
  html: "<p>See you soon</p>",
};

export function emailContract(name: string, setup: () => EmailSender | Promise<EmailSender>) {
  describe(`${name}: email contract`, () => {
    it("sends a valid message", async () => {
      const sender = await setup();
      const result = await sender.send(sampleMessage);
      assert.ok(result.id === null || typeof result.id === "string");
    });

    it("rejects bad messages before sending, as invalid and not retryable", async () => {
      const sender = await setup();
      for (const bad of [
        { ...sampleMessage, to: [] },
        { ...sampleMessage, to: [{ email: "not-an-address" }] },
        { ...sampleMessage, subject: "  " },
        { ...sampleMessage, from: { email: "nobody" } },
      ]) {
        await assert.rejects(sender.send(bad), (e: unknown) => {
          assert.ok(e instanceof EmailError);
          assert.equal(e.code, "invalid");
          assert.equal(e.retryable, false);
          return true;
        });
      }
    });
  });
}
