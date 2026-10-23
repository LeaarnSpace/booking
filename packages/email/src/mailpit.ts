// Mailpit, for local development: catches every message and shows it at http://localhost:8025, so nothing
// is really sent. Uses Mailpit's HTTP send API rather than SMTP, keeping every adapter fetch-only.
// https://mailpit.axllent.org/docs/api-v1/view.html#post-/api/v1/send
import { EmailError, errorFromStatus, validate } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export interface MailpitOptions {
  /** e.g. "http://localhost:8025" */
  baseUrl: string;
  fetch?: typeof fetch;
}

const toMailpit = (a: { email: string; name?: string }) => ({ Email: a.email, Name: a.name ?? "" });

export function createMailpitSender(options: MailpitOptions): EmailSender {
  const doFetch = options.fetch ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  return {
    driver: "mailpit",
    async send(message: EmailMessage) {
      validate(message);
      let res: Response;
      try {
        res = await doFetch(`${baseUrl}/api/v1/send`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            From: toMailpit(message.from),
            To: message.to.map(toMailpit),
            ReplyTo: message.replyTo ? [toMailpit(message.replyTo)] : undefined,
            Subject: message.subject,
            Text: message.text,
            HTML: message.html,
          }),
        });
      } catch (cause) {
        throw new EmailError("unavailable", `Couldn't reach Mailpit at ${baseUrl}. Is it running?`, { cause });
      }
      if (!res.ok) throw errorFromStatus(res.status, (await res.text()).slice(0, 300));
      const body = (await res.json().catch(() => ({}))) as { ID?: string };
      return { id: body.ID ?? null };
    },
  };
}
