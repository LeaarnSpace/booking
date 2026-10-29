import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { withBackup } from "./backup.ts";
import { createBrevoSender } from "./brevo.ts";
import { createConsoleSender } from "./console.ts";
import { emailContract, sampleMessage } from "./contract.ts";
import { EmailError } from "./errors.ts";
import { createEmailFromEnv } from "./factory.ts";
import { createGmailSender, toMime } from "./gmail.ts";
import { createMailpitSender } from "./mailpit.ts";
import { createMemorySender } from "./memory.ts";
import {
  bookingConfirmedEmail,
  bookingRequestedEmail,
  learnSpaceBrand,
  signInCodeEmail,
  type BookingSummary,
} from "./templates/index.ts";

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
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

/** Answers Google's token endpoint and Gmail's send endpoint; `send` sets the send reply */
function fakeGoogle(send: { status: number; body: unknown } = { status: 200, body: { id: "gm-1" } }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
    return new Response(JSON.stringify(send.body), { status: send.status });
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

const gmail = (f: typeof fetch) =>
  createGmailSender({
    clientEmail: "svc@project.iam.gserviceaccount.com",
    privateKey,
    sender: "info@example.com",
    fetch: f,
  });

emailContract("gmail", () => gmail(fakeGoogle()));
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

describe("gmail", () => {
  it("signs in as the sender mailbox with a token limited to sending", async () => {
    const f = fakeGoogle();
    await gmail(f).send(sampleMessage);
    const form = new URLSearchParams(String(f.calls[0].init.body));
    const [header, claims, signature] = form.get("assertion")!.split(".");
    const payload = JSON.parse(Buffer.from(claims, "base64url").toString());
    assert.equal(payload.sub, "info@example.com");
    assert.equal(payload.scope, "https://www.googleapis.com/auth/gmail.send");
    const valid = createVerify("RSA-SHA256")
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(signature, "base64url"));
    assert.ok(valid, "the token request is signed with the service account key");
  });

  it("sends MIME with both versions and reuses the token", async () => {
    const f = fakeGoogle();
    const sender = gmail(f);
    assert.equal((await sender.send(sampleMessage)).id, "gm-1");
    await sender.send(sampleMessage);
    assert.equal(f.calls.filter((c) => c.url.includes("token")).length, 1);
    const send = f.calls[1];
    assert.equal(send.url, "https://gmail.googleapis.com/gmail/v1/users/info%40example.com/messages/send");
    const mime = Buffer.from(JSON.parse(String(send.init.body)).raw, "base64url").toString();
    assert.match(mime, /^From: "Learn Space" <bookings@example.com>\r\n/);
    assert.match(mime, /Content-Type: text\/plain; charset=UTF-8/);
    assert.match(mime, /Content-Type: text\/html; charset=UTF-8/);
  });

  it("encodes non-ASCII names and subjects, and keeps line breaks out of headers", () => {
    const mime = toMime({
      ...sampleMessage,
      to: [{ email: "a@example.com", name: "Adéọlá\r\nBcc: evil@example.com" }],
      subject: "Booking ₦45,000",
    });
    const headers = mime.split("\r\n\r\n")[0];
    assert.ok(!headers.includes("Bcc:"));
    assert.match(headers, /To: =\?UTF-8\?B\?/);
    assert.match(headers, /Subject: =\?UTF-8\?B\?/);
  });

  it("maps Gmail failures, including its 403 sending limits", async () => {
    const cases: [number, unknown, string, boolean][] = [
      [400, { error: "bad" }, "invalid", false],
      [403, { error: { errors: [{ reason: "dailyLimitExceeded" }] } }, "rate_limited", true],
      [403, { error: "forbidden" }, "unauthorized", false],
      [429, {}, "rate_limited", true],
      [500, {}, "unavailable", true],
    ];
    for (const [status, body, code, retryable] of cases) {
      await assert.rejects(gmail(fakeGoogle({ status, body })).send(sampleMessage), (e: unknown) => {
        assert.ok(e instanceof EmailError);
        assert.equal(e.code, code, `status ${status}`);
        assert.equal(e.retryable, retryable);
        return true;
      });
    }
  });

  it("treats a refused service account as unauthorized, not retryable", async () => {
    const f = (async () => new Response('{"error":"unauthorized_client"}', { status: 401 })) as unknown as typeof fetch;
    await assert.rejects(gmail(f).send(sampleMessage), (e: unknown) => {
      assert.ok(e instanceof EmailError && e.code === "unauthorized" && !e.retryable);
      return true;
    });
  });
});

describe("backup", () => {
  it("sends with the backup when the main provider fails, but not for bad messages", async () => {
    const failing = createBrevoSender({ apiKey: "k", fetch: fakeFetch(503) });
    const backup = createMemorySender();
    const sender = withBackup(failing, backup, () => {});
    assert.equal(sender.driver, "brevo+memory");
    await sender.send(sampleMessage);
    assert.equal(backup.sent.length, 1);
    await assert.rejects(sender.send({ ...sampleMessage, to: [] }), EmailError);
    assert.equal(backup.sent.length, 1);
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
    await assert.rejects(createEmailFromEnv({ EMAIL_DRIVER: "gmail" }, { production: true }), EmailError);
  });

  it("puts a backup provider behind the main one", async () => {
    const sender = await createEmailFromEnv(
      {
        EMAIL_DRIVER: "gmail",
        GMAIL_CLIENT_EMAIL: "svc@x",
        GMAIL_PRIVATE_KEY: privateKey,
        GMAIL_SENDER: "info@example.com",
        EMAIL_BACKUP_DRIVER: "brevo",
        BREVO_API_KEY: "k",
      },
      { production: true },
    );
    assert.equal(sender.driver, "gmail+brevo");
    await assert.rejects(
      createEmailFromEnv(
        { EMAIL_DRIVER: "brevo", BREVO_API_KEY: "k", EMAIL_BACKUP_DRIVER: "console" },
        { production: true },
      ),
      EmailError,
    );
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

describe("booking templates", () => {
  const booking: BookingSummary = {
    ref: "LS-0311-4821",
    space: "Creative <Space>",
    service: "Video Podcast",
    start: "2026-11-03T09:00:00.000Z",
    end: "2026-11-03T12:00:00.000Z",
    amount: 45000,
  };

  it("shows Lagos times and naira, and escapes what customers and staff typed", () => {
    const email = bookingRequestedEmail({
      brand: learnSpaceBrand,
      name: "Amara Okafor",
      booking,
      holdExpiresAt: "2026-11-02T09:00:00.000Z",
      payment: { bankName: "GTBank", accountName: "Learn Space Ltd", accountNumber: "0123456789" },
      payUrl: "https://book.example.com/bookings/LS-0311-4821/pay",
    });
    assert.ok(email.text.startsWith("Hi Amara,"));
    assert.ok(email.text.includes("Tuesday 3 November 2026, 10:00–13:00"), email.text);
    assert.ok(email.text.includes("₦45,000"));
    assert.ok(email.text.includes("0123456789"));
    assert.ok(email.html.includes("Creative &lt;Space&gt;"));
    assert.ok(!email.html.includes("Creative <Space>"));
  });

  it("says when and where a confirmed booking is", () => {
    const email = bookingConfirmedEmail({
      brand: learnSpaceBrand,
      name: "Amara",
      booking,
      bookingUrl: "https://book.example.com/bookings/LS-0311-4821",
      calendarUrl: "https://book.example.com/bookings/LS-0311-4821/calendar",
      googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Video",
      address: "38, Diya Street, Gbagada, Lagos",
    });
    assert.match(email.subject, /^Booking confirmed: Video Podcast · Creative <Space>, Tuesday 3 November/);
    assert.ok(email.text.includes("Where: 38, Diya Street, Gbagada, Lagos"));
    assert.ok(
      email.text.includes("Google Calendar: https://calendar.google.com/calendar/render?action=TEMPLATE&text=Video"),
    );
    assert.ok(email.html.includes('href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Video"'));
  });
});
