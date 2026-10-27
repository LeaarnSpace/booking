import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createConsoleChat } from "./console.ts";
import { chatContract, sampleChat } from "./contract.ts";
import { ChatError } from "./errors.ts";
import { createChatFromEnv } from "./factory.ts";
import { createMemoryChat } from "./memory.ts";
import { createSlackSender, toSlack } from "./slack.ts";

const WEBHOOK = "https://hooks.slack.com/services/T000/B000/xyz";

/** A stand-in for fetch that records requests and answers with `status` */
function fakeFetch(status = 200, body = "ok") {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

chatContract("memory", () => createMemoryChat());
chatContract("console", () => createConsoleChat(() => {}));
chatContract("slack", () => createSlackSender({ webhookUrl: WEBHOOK, fetch: fakeFetch() }));

describe("slack", () => {
  it("posts blocks with the title as the notification text and a button", async () => {
    const f = fakeFetch();
    await createSlackSender({ webhookUrl: WEBHOOK, fetch: f }).send(sampleChat);
    assert.equal(f.calls[0].url, WEBHOOK);
    const body = JSON.parse(String(f.calls[0].init.body));
    assert.equal(body.text, sampleChat.title);
    assert.equal(body.blocks.at(-1).elements[0].url, sampleChat.link!.url);
  });

  it("escapes Slack's control characters", () => {
    const body = toSlack({ title: "a <b> & c", lines: ["<!channel>"] });
    assert.equal(body.blocks[0].text!.text, "*a &lt;b&gt; &amp; c*");
    assert.equal(body.blocks[1].text!.text, "&lt;!channel&gt;");
  });

  it("maps Slack failures to retryable or not", async () => {
    const cases: [number, string, boolean][] = [
      [400, "invalid", false],
      [404, "unauthorized", false],
      [410, "unauthorized", false],
      [429, "rate_limited", true],
      [503, "unavailable", true],
    ];
    for (const [status, code, retryable] of cases) {
      const sender = createSlackSender({ webhookUrl: WEBHOOK, fetch: fakeFetch(status, "nope") });
      await assert.rejects(sender.send(sampleChat), (e: unknown) => {
        assert.ok(e instanceof ChatError);
        assert.equal(e.code, code);
        assert.equal(e.retryable, retryable);
        return true;
      });
    }
  });

  it("only accepts Slack webhook addresses", () => {
    assert.throws(() => createSlackSender({ webhookUrl: "https://example.com/hook" }), ChatError);
  });
});

describe("factory", () => {
  it("logs to the console in development and is off in production unless set", async () => {
    assert.equal((await createChatFromEnv({}, { production: false }))?.driver, "console");
    assert.equal(await createChatFromEnv({}, { production: true }), null);
  });

  it("refuses development drivers and missing webhooks in production", async () => {
    await assert.rejects(createChatFromEnv({ CHAT_DRIVER: "console" }, { production: true }), ChatError);
    await assert.rejects(createChatFromEnv({ CHAT_DRIVER: "slack" }, { production: true }), ChatError);
    const slack = await createChatFromEnv({ CHAT_DRIVER: "slack", SLACK_WEBHOOK_URL: WEBHOOK }, { production: true });
    assert.equal(slack?.driver, "slack");
  });
});
