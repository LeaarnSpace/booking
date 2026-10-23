// The object storage interface. Apps depend on this; each provider is one small adapter behind it.

export interface ObjectInfo {
  key: string;
  size: number;
  contentType: string | null;
  etag: string | null;
  lastModified: Date | null;
}

/** Where and how the browser uploads a file directly to storage */
export interface PresignedUpload {
  url: string;
  method: "PUT";
  /** Headers the upload must send exactly as given (the size is fixed by the signature too) */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface UploadOptions {
  contentType: string;
  /** Exact size in bytes. The upload is rejected if the body is a different size. */
  size: number;
  /** Seconds the URL stays valid (default 300) */
  expiresIn?: number;
}

export interface DownloadOptions {
  /** Seconds the URL stays valid (default 300) */
  expiresIn?: number;
  /** File name to save as. Set it to make the browser download instead of display. */
  downloadName?: string;
}

export interface ObjectStorage {
  /** Which adapter this is, for logs and diagnostics */
  readonly driver: "s3" | "local" | "memory";
  readonly bucket: string;
  /** Signed URL for the browser to PUT one file of this type and size */
  createUploadUrl(key: string, options: UploadOptions): Promise<PresignedUpload>;
  /** Short-lived signed URL to view or download a private object */
  createDownloadUrl(key: string, options?: DownloadOptions): Promise<string>;
  /** Permanent URL for buckets served publicly, or null when the bucket is private */
  publicUrl(key: string): string | null;
  /** Size and type of an object, or null when it doesn't exist */
  head(key: string): Promise<ObjectInfo | null>;
  /** Object contents, or null when it doesn't exist. For small files only. */
  get(key: string): Promise<{ bytes: Uint8Array; info: ObjectInfo } | null>;
  put(key: string, body: Uint8Array | string, options: { contentType: string }): Promise<void>;
  /** Removes an object. Succeeds when it is already gone. */
  delete(key: string): Promise<void>;
}

/** Adapters that serve their own signed URLs (local disk, memory) mount this in an app route */
export interface SelfServedStorage extends ObjectStorage {
  handleRequest(request: Request): Promise<Response>;
}
