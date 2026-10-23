// Brevo (free plan: 300 emails a day). Uses its HTTP API with fetch only, so it runs on Workers too.
// https://developers.brevo.com/reference/sendtransacemail
import { EmailError, errorFromStatus, validate } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export interface BrevoOptions {
  apiKey: string;
  /** Defaults to Brevo's API; tests point it elsewhere */
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createBrevoSender(options: BrevoOptions): EmailSender {
  if (!options.apiKey) throw new EmailError("config", "Brevo needs an API key");
  const baseUrl = options.baseUrl ?? "https://api.brevo.com";
  const doFetch = options.fetch ?? fetch;

  return {
    driver: "brevo",
    async send(message: EmailMessage) {
      validate(message);
      let res: Response;
      try {
        res = await doFetch(`${baseUrl}/v3/smtp/email`, {
          method: "POST",
          headers: { "api-key": options.apiKey, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: message.from,
            to: message.to,
            replyTo: message.replyTo,
            subject: message.subject,
            htmlContent: message.html,
            textContent: message.text,
          }),
        });
      } catch (cause) {
        throw new EmailError("unavailable", "Couldn't reach Brevo", { cause });
      }
      if (!res.ok) throw errorFromStatus(res.status, (await res.text()).slice(0, 300));
      const body = (await res.json().catch(() => ({}))) as { messageId?: string };
      return { id: body.messageId ?? null };
    },
  };
}
