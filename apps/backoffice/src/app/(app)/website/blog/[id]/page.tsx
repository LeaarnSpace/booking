import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, listCategories, postPath } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteItem } from "@/components/website/delete-item";
import { PageLink } from "@/components/website/page-link";
import { env } from "@/lib/env";
import { can } from "@/lib/sections";
import { mediaStorage, viewUrl } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { deletePost, savePost } from "../../actions";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireSection("website", "editor");
  const { id } = await params;
  // Not a post id at all: treat like a missing post rather than asking the database
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [post, categories] = await Promise.all([getPost(id), listCategories("blog")]);
  if (!post) notFound();
  const imageUrl = post.imageKey ? await viewUrl(await mediaStorage(), post.imageKey) : null;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Edit post" description="Changes reach the website at the next publish." />
      <PageLink url={new URL(postPath(post.slug), env.website.url).toString()} live={post.status === "live"} />
      <PostForm
        key={post.updatedAt.toISOString()}
        post={post}
        imageUrl={imageUrl}
        categories={categories}
        siteHost={new URL(env.website.url).host}
        action={savePost.bind(null, post.id)}
        submitLabel="Save changes"
      />
      {can(viewer.access, "website", "manager") && (
        <DeleteItem id={post.id} title={post.title} noun="post" remove={deletePost} />
      )}
    </div>
  );
}
