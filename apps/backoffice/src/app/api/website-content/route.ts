// Read by the website's build (not by visitors): the content it publishes, shown items only. Needs
// WEBSITE_CONTENT_SECRET, the same value in both projects; without it this endpoint is off. Photos are sent as their
// public addresses in media storage; the website's build downloads and resizes them, so visitors never load them
// from storage directly.
import { timingSafeEqual } from "node:crypto";
import {
  contentStarted,
  publishedCategories,
  publishedNews,
  publishedPosts,
  publishedRoles,
} from "@learnspace/website-content";
import { env } from "@/lib/env";
import { mediaStorage, viewUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const matches = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  const secret = env.website.contentSecret;
  if (!secret) return new Response("Not found", { status: 404 });
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!matches(given, secret)) return new Response("Unauthorized", { status: 401 });
  const [roles, news, blog, newsCategories, blogCategories, started, media] = await Promise.all([
    publishedRoles(),
    publishedNews(),
    publishedPosts(),
    publishedCategories("news"),
    publishedCategories("blog"),
    contentStarted(),
    mediaStorage(),
  ]);
  // A week-long link if the bucket isn't public: long enough for any build to fetch it
  const image = (key: string) => viewUrl(media, key, 7 * 24 * 3600);
  return Response.json(
    {
      roles,
      news: await Promise.all(
        news.map(async ({ imageKey, ...story }) => ({
          ...story,
          ...(imageKey ? { image: await image(imageKey) } : {}),
        })),
      ),
      blog: await Promise.all(blog.map(async ({ imageKey, ...post }) => ({ ...post, image: await image(imageKey) }))),
      categories: { news: newsCategories, blog: blogCategories },
      // Kinds nobody has added anything to yet: the website uses its own Markdown files for those
      started,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
