import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Pencil, Plus } from "lucide-react";
import { listCategories, listNews } from "@learnspace/website-content";
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
import { setNewsStatus } from "../actions";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const viewer = await requireSection("website");
  const canEdit = can(viewer.access, "website", "editor");
  const [stories, categories, { saved }] = await Promise.all([listNews(), listCategories("news"), searchParams]);
  const live = stories.filter((s) => s.status === "live").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="News"
        description="Stories from other publishers on the website’s News page and homepage, newest first, with our take on them."
        actions={
          canEdit && (
            <Link href="/website/news/new" className={buttonStyles()}>
              <Plus size={16} aria-hidden="true" /> Add story
            </Link>
          )
        }
      />

      <PublishBar canPublish={canEdit} />
      {saved && (
        <p role="status" className="text-sm text-confirmed-ink">
          Story saved. Publish when you’re ready for it to show on the website.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="news-heading" className="flex flex-col gap-3">
          <h2 id="news-heading" className="text-sm font-semibold text-subtle">
            {stories.length ? `${live} live, ${stories.length - live} draft. Newest first.` : "Stories"}
          </h2>
          {stories.length === 0 ? (
            <EmptyState icon={Newspaper} title="No stories yet">
              {canEdit ? "Add a story and publish to show it on the website." : "Nothing has been added yet."}
            </EmptyState>
          ) : (
            <Card>
              <ul className="divide-y divide-line-soft">
                {stories.map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className={s.status === "live" ? "font-semibold text-ink" : "font-semibold text-subtle"}>
                        {s.title}
                      </p>
                      <p className="text-sm text-subtle">
                        {s.category} · {formatIsoDate(s.date)}
                        {s.source && ` · ${s.source}`}
                        {s.body.trim() && " · With our take"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <StatusControls
                        key={`${s.id}-${s.status}`}
                        id={s.id}
                        title={s.title}
                        status={s.status}
                        setStatus={setNewsStatus}
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <Link
                          href={`/website/news/${s.id}`}
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
            Categories: the News page’s filters, in this order
          </h2>
          <Card className="p-4 sm:px-5">
            <CategoryEditor
              kind="news"
              categories={categories}
              canEdit={canEdit}
              canDelete={can(viewer.access, "website", "manager")}
              usedLabel="story"
              usedPlural="stories"
            />
          </Card>
        </section>
      </div>
    </div>
  );
}
