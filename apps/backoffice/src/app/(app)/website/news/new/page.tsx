import type { Metadata } from "next";
import { listCategories } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { lagosIsoDate } from "@/lib/bookings/format";
import { env } from "@/lib/env";
import { requireSection } from "@/lib/viewer";
import { saveNews } from "../../actions";
import { NewsForm } from "../news-form";

export const metadata: Metadata = { title: "Add story" };

export default async function NewStoryPage() {
  await requireSection("website", "editor");
  const categories = await listCategories("news");
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Add story" description="Publish to show it on the website." />
      <NewsForm
        categories={categories}
        siteHost={new URL(env.website.url).host}
        action={saveNews.bind(null, null)}
        submitLabel="Add story"
        imageUrl={null}
        story={{
          slug: "",
          title: "",
          categoryId: "",
          date: lagosIsoDate(new Date()),
          imageKey: null,
          source: null,
          sourceUrl: null,
          summary: "",
          body: "",
          author: null,
          reviewer: null,
          related: [],
          status: "live",
        }}
      />
    </div>
  );
}
