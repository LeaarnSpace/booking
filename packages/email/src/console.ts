// Development without Mailpit: prints each message to the server log instead of sending it.
import { validate } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export function createConsoleSender(log: (line: string) => void = console.info): EmailSender {
  return {
    driver: "console",
    async send(message: EmailMessage) {
      validate(message);
      log(
        [
          `── email to ${message.to.map((t) => t.email).join(", ")} ──`,
          `Subject: ${message.subject}`,
          message.text,
          "──",
        ].join("\n"),
      );
      return { id: null };
    },
  };
}
