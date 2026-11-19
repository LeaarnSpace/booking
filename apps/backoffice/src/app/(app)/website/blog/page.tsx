import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Pencil, Plus } from "lucide-react";
import { listCategories, listPosts } from "@learnspace/website-content";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryEditor } from "@/components/website/category-editor";
import { PublishBar } from "@/components/website/publish-bar";
import { StatusControls } from "@/components/website/status-controls";
import { formatIsoDate } from "@/lib/bookings/format";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";
import { movePost, setPostStatus } from "../actions";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const viewer = await requireSection("website");
  const canEdit = can(viewer.access, "website", "editor");
  const [posts, categories, { saved }] = await Promise.all([listPosts(), listCategories("blog"), searchParams]);
  const live = posts.filter((s) => s.status === "live").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Blog"
        description="Posts and episodes on the website’s Blog page and homepage, in the order shown here."
        actions={
          canEdit && (
            <Link href="/website/blog/new" className={buttonStyles()}>
              <Plus size={16} aria-hidden="true" /> Add post
            </Link>
          )
        }
      />

      <PublishBar canPublish={canEdit} />
      {saved && (
        <p role="status" className="text-sm text-confirmed-ink">
          Post saved. Publish when you’re ready for it to show on the website.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="blog-heading" className="flex flex-col gap-3">
          <h2 id="blog-heading" className="text-sm font-semibold text-subtle">
            {posts.length ? `${live} live, ${posts.length - live} draft. Shown in this order.` : "Posts"}
          </h2>
          {posts.length === 0 ? (
            <EmptyState icon={BookOpen} title="No posts yet">
              {canEdit ? "Add a post and publish to show it on the website." : "Nothing has been added yet."}
            </EmptyState>
          ) : (
            <Card>
              <ul className="divide-y divide-line-soft">
                {posts.map((s, i) => (
                  <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className={s.status === "live" ? "font-semibold text-ink" : "font-semibold text-subtle"}>
                        {s.title}
                      </p>
                      <p className="text-sm text-subtle">
                        {[s.category, s.date && formatIsoDate(s.date), s.duration].filter(Boolean).join(" · ") ||
                          "No category"}
                        {!s.imageKey && " · No photo yet"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <StatusControls
                        key={`${s.id}-${s.status}`}
                        id={s.id}
                        title={s.title}
                        status={s.status}
                        setStatus={setPostStatus}
                        move={movePost}
                        first={i === 0}
                        last={i === posts.length - 1}
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <Link
                          href={`/website/blog/${s.id}`}
                          aria-label={`Edit ${s.title}`}
                          className={buttonStyles({ variant: "secondary", size: "sm" })}
                        >
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
          <h2 id="categories-heading" className="text-sm font-semibold text-subtle">
            Categories: the Blog page’s filters, in this order
          </h2>
          <Card className="p-4 sm:px-5">
            <CategoryEditor
              kind="blog"
              categories={categories}
              canEdit={canEdit}
              canDelete={can(viewer.access, "website", "manager")}
              usedLabel="post"
            />
          </Card>
        </section>
      </div>
    </div>
  );
}
