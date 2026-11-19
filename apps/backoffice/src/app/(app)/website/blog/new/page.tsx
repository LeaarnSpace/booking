import type { Metadata } from "next";
import { listCategories } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { lagosIsoDate } from "@/lib/bookings/format";
import { env } from "@/lib/env";
import { requireSection } from "@/lib/viewer";
import { savePost } from "../../actions";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "Add post" };

export default async function NewPostPage() {
  await requireSection("website", "editor");
  const categories = await listCategories("blog");
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Add post" description="It goes to the top of the list. Publish to show it on the website." />
      <PostForm
        categories={categories}
        siteHost={new URL(env.website.url).host}
        action={savePost.bind(null, null)}
        submitLabel="Add post"
        imageUrl={null}
        post={{
          slug: "",
          title: "",
          excerpt: "",
          categoryId: null,
          date: lagosIsoDate(new Date()),
          duration: null,
          imageKey: null,
          body: "",
          status: "live",
        }}
      />
    </div>
  );
}
