export type StorageErrorCode = "not_found" | "forbidden" | "invalid" | "unavailable" | "config";

/** The one error type every adapter throws. `retryable` says whether trying again later might work. */
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: StorageErrorCode,
    message: string,
    options: { retryable?: boolean; status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "StorageError";
    this.code = code;
    this.retryable = options.retryable ?? code === "unavailable";
    this.status = options.status;
  }
}

/** Maps an HTTP status from a storage provider to a StorageError */
export function errorFromStatus(status: number, what: string) {
  if (status === 404) return new StorageError("not_found", `${what}: not found`, { status });
  if (status === 401 || status === 403) return new StorageError("forbidden", `${what}: access denied`, { status });
  if (status === 429 || status >= 500)
    return new StorageError("unavailable", `${what}: storage unavailable (${status})`, { status });
  return new StorageError("invalid", `${what}: rejected (${status})`, { status });
}
