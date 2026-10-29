// Picks the chat adapter from settings, so switching provider is a settings change:
//   CHAT_DRIVER        slack | console | memory   (default: console in development, off in production)
//   SLACK_WEBHOOK_URL  for slack
// Chat is optional: with no CHAT_DRIVER in production this returns null and nothing is posted. Production
// refuses the development drivers, so a typo doesn't silently post nowhere.
import { ChatError } from "./errors.ts";
import type { ChatSender } from "./types.ts";

const DRIVERS = ["slack", "console", "memory"] as const;
type Driver = (typeof DRIVERS)[number];
const PRODUCTION_DRIVERS: Driver[] = ["slack"];

export async function createChatFromEnv(
  env: Record<string, string | undefined>,
  options: { production: boolean },
): Promise<ChatSender | null> {
  const driver = (env.CHAT_DRIVER || (options.production ? "" : "console")) as Driver | "";
  if (!driver) return null;
  if (!DRIVERS.includes(driver)) throw new ChatError("config", `Set CHAT_DRIVER to one of: ${DRIVERS.join(", ")}`);
  if (options.production && !PRODUCTION_DRIVERS.includes(driver)) {
    throw new ChatError("config", `CHAT_DRIVER=${driver} doesn't post anywhere; use slack in production`);
  }
  switch (driver) {
    case "slack": {
      if (!env.SLACK_WEBHOOK_URL) throw new ChatError("config", "Set SLACK_WEBHOOK_URL");
      const { createSlackSender } = await import("./slack.ts");
      return createSlackSender({ webhookUrl: env.SLACK_WEBHOOK_URL });
    }
    case "console": {
      const { createConsoleChat } = await import("./console.ts");
      return createConsoleChat();
    }
    case "memory": {
      const { createMemoryChat } = await import("./memory.ts");
      return createMemoryChat();
    }
  }
}
