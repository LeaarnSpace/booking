// Picks the storage adapter from settings, so changing provider is a settings change.
//
//   STORAGE_DRIVER                 s3 | local | memory   (default: local, except in production)
//   STORAGE_<NAME>_BUCKET          bucket for this kind of file, e.g. STORAGE_RECEIPTS_BUCKET
//   STORAGE_<NAME>_PUBLIC_URL      public address of the bucket, only for public files (e.g. room photos)
//   STORAGE_S3_ENDPOINT            e.g. https://<account id>.r2.cloudflarestorage.com
//   STORAGE_S3_REGION              "auto" for R2 (default)
//   STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY
//   STORAGE_LOCAL_DIR              folder for the local adapter (default .storage)
//
// Adapters are loaded on demand, so a production bundle never runs the local-disk code.
import { StorageError } from "./errors.ts";
import type { ObjectStorage } from "./types.ts";

export type Env = Record<string, string | undefined>;

export interface FactoryOptions {
  /** Refuses the local and memory adapters and requires complete S3 settings */
  production: boolean;
  /** Where the app serves local-adapter URLs, e.g. http://localhost:4400/api/local-storage */
  localBaseUrl: string;
  /** Signs local-adapter URLs */
  localSecret?: string;
  /** Objects can be read without a signature (only for files meant to be public) */
  publicRead?: boolean;
}

export async function createStorageFromEnv(name: string, rawEnv: Env, options: FactoryOptions): Promise<ObjectStorage> {
  // Empty values (a copied .env.example) count as not set
  const env: Env = Object.fromEntries(Object.entries(rawEnv).filter(([, v]) => v !== ""));
  const driver = env.STORAGE_DRIVER ?? (options.production ? undefined : "local");
  const bucket = env[`STORAGE_${name}_BUCKET`] ?? (options.production ? undefined : name.toLowerCase());
  const missing = (what: string) => new StorageError("config", `Storage for ${name}: ${what} is not set`);
  if (!driver) throw missing("STORAGE_DRIVER");
  if (!bucket) throw missing(`STORAGE_${name}_BUCKET`);

  if (driver === "s3") {
    const required = ["STORAGE_S3_ENDPOINT", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY"] as const;
    for (const key of required) if (!env[key]) throw missing(key);
    const publicBaseUrl = env[`STORAGE_${name}_PUBLIC_URL`];
    if (options.publicRead && !publicBaseUrl && options.production) throw missing(`STORAGE_${name}_PUBLIC_URL`);
    const { createS3Storage } = await import("./s3.ts");
    return createS3Storage({
      endpoint: env.STORAGE_S3_ENDPOINT!,
      region: env.STORAGE_S3_REGION ?? "auto",
      accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY!,
      bucket,
      publicBaseUrl,
    });
  }

  if (options.production) {
    throw new StorageError("config", `Storage for ${name}: the "${driver}" adapter can't be used in production`);
  }
  if (driver === "local") {
    const { createLocalStorage } = await import("./local.ts");
    return createLocalStorage({
      dir: env.STORAGE_LOCAL_DIR ?? ".storage",
      bucket,
      baseUrl: options.localBaseUrl,
      secret: options.localSecret ?? "",
      publicRead: options.publicRead,
    });
  }
  if (driver === "memory") {
    const { createMemoryStorage } = await import("./memory.ts");
    return createMemoryStorage({ bucket, baseUrl: options.localBaseUrl, publicRead: options.publicRead });
  }
  throw new StorageError("config", `Storage for ${name}: unknown STORAGE_DRIVER "${driver}"`);
}
