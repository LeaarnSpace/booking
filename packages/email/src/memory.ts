// Keeps sent messages in memory, for tests.
import { validate } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export interface MemorySender extends EmailSender {
  readonly sent: EmailMessage[];
}

export function createMemorySender(): MemorySender {
  const sent: EmailMessage[] = [];
  return {
    driver: "memory",
    sent,
    async send(message: EmailMessage) {
      validate(message);
      sent.push(message);
      return { id: String(sent.length) };
    },
  };
}
