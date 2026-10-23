import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBrevoSender } from "./brevo.ts";
import { createConsoleSender } from "./console.ts";
import { emailContract, sampleMessage } from "./contract.ts";
import { EmailError } from "./errors.ts";
import { createEmailFromEnv } from "./factory.ts";
import { createMailpitSender } from "./mailpit.ts";
import { createMemorySender } from "./memory.ts";
import { learnSpaceBrand, signInCodeEmail } from "./templates/index.ts";

/** A stand-in for fetch that records requests and answers with `status` */
function fakeFetch(status = 200, body: unknown = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

emailContract("memory", () => createMemorySender());
emailContract("console", () => createConsoleSender(() => {}));
emailContract("brevo", () => createBrevoSender({ apiKey: "test", fetch: fakeFetch(201, { messageId: "abc" }) }));
emailContract("mailpit", () => createMailpitSender({ baseUrl: "http://mailpit", fetch: fakeFetch(200, { ID: "x" }) }));

describe("brevo", () => {
  it("sends the message in Brevo's format", async () => {
    const f = fakeFetch(201, { messageId: "abc" });
    const result = await createBrevoSender({ apiKey: "key", fetch: f }).send(sampleMessage);
    assert.equal(result.id, "abc");
    assert.equal(f.calls[0].url, "https://api.brevo.com/v3/smtp/email");
    assert.equal((f.calls[0].init.headers as Record<string, string>)["api-key"], "key");
    const body = JSON.parse(String(f.calls[0].init.body));
    assert.equal(body.sender.email, "bookings@example.com");
    assert.equal(body.htmlContent, sampleMessage.html);
  });

  it("maps provider failures to retryable or not", async () => {
    const cases: [number, string, boolean][] = [
      [400, "invalid", false],
      [401, "unauthorized", false],
      [429, "rate_limited", true],
      [503, "unavailable", true],
    ];
    for (const [status, code, retryable] of cases) {
      const sender = createBrevoSender({ apiKey: "key", fetch: fakeFetch(status, { message: "nope" }) });
      await assert.rejects(sender.send(sampleMessage), (e: unknown) => {
        assert.ok(e instanceof EmailError);
        assert.equal(e.code, code);
        assert.equal(e.retryable, retryable);
        return true;
      });
    }
  });

  it("treats a network failure as retryable", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await assert.rejects(createBrevoSender({ apiKey: "key", fetch: failing }).send(sampleMessage), (e: unknown) => {
      assert.ok(e instanceof EmailError && e.code === "unavailable" && e.retryable);
      return true;
    });
  });
});

describe("factory", () => {
  it("uses the console in development by default", async () => {
    assert.equal((await createEmailFromEnv({}, { production: false })).driver, "console");
  });

  it("refuses development drivers and missing keys in production", async () => {
    await assert.rejects(createEmailFromEnv({}, { production: true }), EmailError);
    await assert.rejects(createEmailFromEnv({ EMAIL_DRIVER: "mailpit" }, { production: true }), EmailError);
    await assert.rejects(createEmailFromEnv({ EMAIL_DRIVER: "brevo" }, { production: true }), EmailError);
    const brevo = await createEmailFromEnv({ EMAIL_DRIVER: "brevo", BREVO_API_KEY: "k" }, { production: true });
    assert.equal(brevo.driver, "brevo");
  });
});

describe("sign-in code template", () => {
  it("shows the code and escapes the address", () => {
    const email = signInCodeEmail({ brand: learnSpaceBrand, code: "123456", email: "a<b>@example.com" });
    assert.equal(email.subject, "123 456 is your Learn Space sign-in code");
    assert.ok(email.text.includes("123 456"));
    assert.ok(email.html.includes("a&lt;b&gt;@example.com"));
    assert.ok(!email.html.includes("a<b>"));
  });
});
