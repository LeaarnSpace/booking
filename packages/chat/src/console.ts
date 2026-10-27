// Development without Slack: prints each message to the server log instead of posting it.
import { validate } from "./errors.ts";
import type { ChatMessage, ChatSender } from "./types.ts";

export function createConsoleChat(log: (line: string) => void = console.info): ChatSender {
  return {
    driver: "console",
    async send(message: ChatMessage) {
      validate(message);
      log(
        [
          `── chat ──`,
          message.title,
          ...(message.lines ?? []),
          ...(message.link ? [`${message.link.label}: ${message.link.url}`] : []),
          "──",
        ].join("\n"),
      );
    },
  };
}
