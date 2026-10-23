// Picks the email adapter from settings, so switching provider is a settings change:
//   EMAIL_DRIVER     brevo | mailpit | console | memory   (default: console in development)
//   BREVO_API_KEY    for brevo
//   MAILPIT_URL      for mailpit (default http://localhost:8025)
// Production refuses the development drivers, so a missing setting fails at start-up rather than
// silently not sending sign-in codes.
import { EmailError } from "./errors.ts";
import type { EmailSender } from "./types.ts";

const DRIVERS = ["brevo", "mailpit", "console", "memory"] as const;
type Driver = (typeof DRIVERS)[number];
const PRODUCTION_DRIVERS: Driver[] = ["brevo"];

export async function createEmailFromEnv(
  env: Record<string, string | undefined>,
  options: { production: boolean },
): Promise<EmailSender> {
  const driver = (env.EMAIL_DRIVER || (options.production ? "" : "console")) as Driver;
  if (!DRIVERS.includes(driver)) {
    throw new EmailError(
      "config",
      `Set EMAIL_DRIVER to one of: ${(options.production ? PRODUCTION_DRIVERS : DRIVERS).join(", ")}`,
    );
  }
  if (options.production && !PRODUCTION_DRIVERS.includes(driver)) {
    throw new EmailError(
      "config",
      `EMAIL_DRIVER=${driver} doesn't send real email; use ${PRODUCTION_DRIVERS.join(" or ")} in production`,
    );
  }
  switch (driver) {
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
