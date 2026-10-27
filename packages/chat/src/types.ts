// Posting a message to the team's chat, whatever the provider. Apps depend on this interface only.

export interface ChatMessage {
  /** One line: the notification text, and what's shown where formatting isn't */
  title: string;
  /** Detail lines under the title */
  lines?: string[];
  /** A button, e.g. "Review" → the booking in the back office */
  link?: { label: string; url: string };
}

export interface ChatSender {
  /** "slack", "console", … for logs */
  readonly driver: string;
  /** Posts one message. Throws ChatError; `retryable` says whether trying again later may work. */
  send(message: ChatMessage): Promise<void>;
}
