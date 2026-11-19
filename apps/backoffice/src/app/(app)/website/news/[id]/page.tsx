import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNews, listCategories, newsPath } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteItem } from "@/components/website/delete-item";
import { PageLink } from "@/components/website/page-link";
import { env } from "@/lib/env";
import { can } from "@/lib/sections";
import { mediaStorage, viewUrl } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { deleteNews, saveNews } from "../../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Edit story" };

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireSection("website", "editor");
  const { id } = await params;
  // Not a story id at all: treat like a missing story rather than asking the database
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [story, categories] = await Promise.all([getNews(id), listCategories("news")]);
  if (!story) notFound();
  const imageUrl = story.imageKey ? await viewUrl(await mediaStorage(), story.imageKey) : null;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Edit story" description="Changes reach the website at the next publish." />
      <PageLink url={new URL(newsPath(story.slug), env.website.url).toString()} live={story.status === "live"} />
      <NewsForm
        key={story.updatedAt.toISOString()}
        story={story}
        imageUrl={imageUrl}
        categories={categories}
        siteHost={new URL(env.website.url).host}
        action={saveNews.bind(null, story.id)}
        submitLabel="Save changes"
      />
      {can(viewer.access, "website", "manager") && (
        <DeleteItem id={story.id} title={story.title} noun="story" remove={deleteNews} />
      )}
    </div>
  );
}
