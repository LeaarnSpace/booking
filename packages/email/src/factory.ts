// Picks the email adapter from settings, so switching provider is a settings change:
//   EMAIL_DRIVER         gmail | brevo | mailpit | console | memory   (default: console in development)
//   EMAIL_BACKUP_DRIVER  optional second provider, used when the first fails (e.g. brevo behind gmail)
//   GMAIL_CLIENT_EMAIL, GMAIL_PRIVATE_KEY, GMAIL_SENDER   for gmail (a service account; see gmail.ts)
//   BREVO_API_KEY        for brevo
//   MAILPIT_URL          for mailpit (default http://localhost:8025)
// Production refuses the development drivers, so a missing setting fails at start-up rather than
// silently not sending sign-in codes.
import { withBackup } from "./backup.ts";
import { EmailError } from "./errors.ts";
import type { EmailSender } from "./types.ts";

const DRIVERS = ["gmail", "brevo", "mailpit", "console", "memory"] as const;
type Driver = (typeof DRIVERS)[number];
const PRODUCTION_DRIVERS: Driver[] = ["gmail", "brevo"];

type Env = Record<string, string | undefined>;

function checkDriver(setting: string, value: string, production: boolean): Driver {
  const driver = value as Driver;
  if (!DRIVERS.includes(driver)) {
    throw new EmailError(
      "config",
      `Set ${setting} to one of: ${(production ? PRODUCTION_DRIVERS : DRIVERS).join(", ")}`,
    );
  }
  if (production && !PRODUCTION_DRIVERS.includes(driver)) {
    throw new EmailError(
      "config",
      `${setting}=${driver} doesn't send real email; use ${PRODUCTION_DRIVERS.join(" or ")} in production`,
    );
  }
  return driver;
}

async function create(driver: Driver, env: Env): Promise<EmailSender> {
  switch (driver) {
    case "gmail": {
      if (!env.GMAIL_CLIENT_EMAIL || !env.GMAIL_PRIVATE_KEY || !env.GMAIL_SENDER) {
        throw new EmailError("config", "Set GMAIL_CLIENT_EMAIL, GMAIL_PRIVATE_KEY and GMAIL_SENDER");
      }
      const { createGmailSender } = await import("./gmail.ts");
      return createGmailSender({
        clientEmail: env.GMAIL_CLIENT_EMAIL,
        privateKey: env.GMAIL_PRIVATE_KEY,
        sender: env.GMAIL_SENDER,
      });
    }
    case "brevo": {
      if (!env.BREVO_API_KEY) throw new EmailError("config", "Set BREVO_API_KEY");
      const { createBrevoSender } = await import("./brevo.ts");
      return createBrevoSender({ apiKey: env.BREVO_API_KEY });
    }
    case "mailpit": {
      const { createMailpitSender } = await import("./mailpit.ts");
      return createMailpitSender({ baseUrl: env.MAILPIT_URL || "http://localhost:8025" });
    }
    case "console": {
      const { createConsoleSender } = await import("./console.ts");
      return createConsoleSender();
    }
    case "memory": {
      const { createMemorySender } = await import("./memory.ts");
      return createMemorySender();
    }
  }
}

export async function createEmailFromEnv(env: Env, options: { production: boolean }): Promise<EmailSender> {
  const primary = await create(
    checkDriver("EMAIL_DRIVER", env.EMAIL_DRIVER || (options.production ? "" : "console"), options.production),
    env,
  );
  if (!env.EMAIL_BACKUP_DRIVER) return primary;
  const backup = await create(checkDriver("EMAIL_BACKUP_DRIVER", env.EMAIL_BACKUP_DRIVER, options.production), env);
  return withBackup(primary, backup);
}
