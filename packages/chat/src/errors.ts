// The one error type every adapter throws, so callers handle failures the same way whatever the provider.

export type ChatErrorCode =
  /** The message was rejected as it is */
  | "invalid"
  /** The webhook was revoked, or its channel archived or deleted */
  | "unauthorized"
  /** Posting too fast */
  | "rate_limited"
  /** Provider down or unreachable */
  | "unavailable"
  /** Missing or wrong settings */
  | "config";

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  /** Whether the same message may go through if sent again later */
  readonly retryable: boolean;

  constructor(code: ChatErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "ChatError";
    this.code = code;
    this.retryable = options?.retryable ?? (code === "rate_limited" || code === "unavailable");
  }
}

/** Shared checks, so every adapter rejects the same bad messages before calling out */
export function validate(message: { title: string }) {
  if (!message.title.trim()) throw new ChatError("invalid", "Message title is empty");
}
