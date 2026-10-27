// Slack through an Incoming Webhook (free on every Slack plan): each webhook posts to one channel. Uses fetch
// only, so it runs on Workers too.
// https://api.slack.com/messaging/webhooks
import { ChatError, validate } from "./errors.ts";
import type { ChatMessage, ChatSender } from "./types.ts";

export interface SlackOptions {
  /** https://hooks.slack.com/services/… */
  webhookUrl: string;
  fetch?: typeof fetch;
}

/** Slack's markup treats these three as control characters */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The message as Slack blocks, with `text` as the notification and fallback */
export function toSlack(message: ChatMessage) {
  return {
    text: message.title,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${esc(message.title)}*` } },
      ...(message.lines?.length
        ? [{ type: "section", text: { type: "mrkdwn", text: message.lines.map(esc).join("\n") } }]
        : []),
      ...(message.link
        ? [
            {
              type: "actions",
              elements: [
                { type: "button", text: { type: "plain_text", text: message.link.label }, url: message.link.url },
              ],
            },
          ]
        : []),
    ],
  };
}

export function createSlackSender(options: SlackOptions): ChatSender {
  if (!/^https:\/\/hooks\.slack\.com\//.test(options.webhookUrl ?? "")) {
    throw new ChatError("config", "Slack needs an Incoming Webhook URL (https://hooks.slack.com/…)");
  }
  const doFetch = options.fetch ?? fetch;

  return {
    driver: "slack",
    async send(message: ChatMessage) {
      validate(message);
      let res: Response;
      try {
        res = await doFetch(options.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toSlack(message)),
        });
      } catch (cause) {
        throw new ChatError("unavailable", "Couldn't reach Slack", { cause });
      }
      if (res.ok) return;
      const detail = (await res.text()).slice(0, 200);
      if (res.status === 429) throw new ChatError("rate_limited", `Slack rate limit: ${detail}`);
      if (res.status >= 500) throw new ChatError("unavailable", `Slack error ${res.status}: ${detail}`);
      // 403 action_prohibited, 404 no_service / channel_not_found, 410 channel_is_archived
      if ([403, 404, 410].includes(res.status)) {
        throw new ChatError("unauthorized", `Slack refused the webhook (${res.status}): ${detail}`);
      }
      throw new ChatError("invalid", `Slack rejected the message (${res.status}): ${detail}`);
    },
  };
}
