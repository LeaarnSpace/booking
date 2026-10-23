// Sending email, whatever the provider. Apps depend on this interface only; the factory picks the adapter.

export interface Address {
  email: string;
  name?: string;
}

export interface EmailMessage {
  from: Address;
  to: Address[];
  replyTo?: Address;
  subject: string;
  /** Plain-text version, for email apps that don't show HTML */
  text: string;
  html: string;
}

export interface EmailSender {
  /** "brevo", "mailpit", … for logs */
  readonly driver: string;
  /** Sends one message. Throws EmailError; `retryable` says whether trying again later may work. */
  send(message: EmailMessage): Promise<{ id: string | null }>;
}
