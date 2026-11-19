// Publishing the website: asks the host to rebuild it (a Vercel deploy hook), and the build then reads the latest
// content from /api/website-content. Rebuilds take about a minute; several publishes in a row are fine, since the
// host cancels the older builds.
import { recordPublish, type Result } from "@learnspace/website-content";
import { env } from "./env";

export async function publishWebsite(by: string): Promise<Result> {
  if (!env.website.deployHookUrl) {
    return {
      ok: false,
      error: "Publishing isn't set up yet: add WEBSITE_DEPLOY_HOOK_URL to the back office settings.",
    };
  }
  let error: string | null = null;
  try {
    const res = await fetch(env.website.deployHookUrl, { method: "POST", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) error = `The website host refused (${res.status}). Check WEBSITE_DEPLOY_HOOK_URL.`;
  } catch {
    error = "Couldn't reach the website host. Try again in a minute.";
  }
  await recordPublish(by, error);
  return error ? { ok: false, error } : { ok: true };
}
