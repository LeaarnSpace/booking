// Keeps posted messages in memory, for tests.
import { validate } from "./errors.ts";
import type { ChatMessage, ChatSender } from "./types.ts";

export interface MemoryChat extends ChatSender {
  readonly sent: ChatMessage[];
}

export function createMemoryChat(): MemoryChat {
  const sent: ChatMessage[] = [];
  return {
    driver: "memory",
    sent,
    async send(message: ChatMessage) {
      validate(message);
      sent.push(message);
    },
  };
}
