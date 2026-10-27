// A second provider for when the first fails: Gmail down, over its daily limit, or its settings broken.
// A message rejected as it is (a bad address) isn't retried with the backup, since it would fail there too.
import { EmailError } from "./errors.ts";
import type { EmailMessage, EmailSender } from "./types.ts";

export function withBackup(primary: EmailSender, backup: EmailSender, log = console.warn): EmailSender {
  return {
    driver: `${primary.driver}+${backup.driver}`,
    async send(message: EmailMessage) {
      try {
        return await primary.send(message);
      } catch (e) {
        if (e instanceof EmailError && e.code === "invalid") throw e;
        log(`Email: ${primary.driver} failed, sending with ${backup.driver}:`, e instanceof Error ? e.message : e);
        return backup.send(message);
      }
    },
  };
}
