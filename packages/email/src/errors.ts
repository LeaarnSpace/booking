// The one error type every adapter throws, so callers handle failures the same way whatever the provider.

export type EmailErrorCode =
  /** The message was rejected as it is (bad address, missing subject) */
  | "invalid"
  /** The provider refused our credentials */
  | "unauthorized"
  /** Sending too fast, or over the daily quota */
  | "rate_limited"
  /** Provider down or unreachable */
  | "unavailable"
  /** Missing or wrong settings */
  | "config";

export class EmailError extends Error {
  readonly code: EmailErrorCode;
  /** Whether the same message may go through if sent again later */
  readonly retryable: boolean;

  constructor(code: EmailErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "EmailError";
    this.code = code;
    this.retryable = options?.retryable ?? (code === "rate_limited" || code === "unavailable");
  }
}

export function errorFromStatus(status: number, detail: string) {
  if (status === 401 || status === 403)
    return new EmailError("unauthorized", `Email provider refused credentials: ${detail}`);
  if (status === 429) return new EmailError("rate_limited", `Email provider rate limit: ${detail}`);
  if (status >= 500) return new EmailError("unavailable", `Email provider error ${status}: ${detail}`);
  return new EmailError("invalid", `Email rejected (${status}): ${detail}`);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared checks, so every adapter rejects the same bad messages before calling out */
export function validate(message: { from: { email: string }; to: { email: string }[]; subject: string }) {
  if (!EMAIL.test(message.from.email)) throw new EmailError("invalid", "Sender address is not valid");
  if (!message.to.length) throw new EmailError("invalid", "No recipients");
  for (const to of message.to) {
    if (!EMAIL.test(to.email)) throw new EmailError("invalid", `Not an email address: ${to.email}`);
  }
  if (!message.subject.trim()) throw new EmailError("invalid", "Subject is empty");
}
