import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listNews, listPosts, listRoles } from "@learnspace/website-content";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PublishBar } from "@/components/website/publish-bar";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Website" };

export default async function WebsitePage() {
  const viewer = await requireSection("website");
  const [roles, stories, posts] = await Promise.all([listRoles(), listNews(), listPosts()]);
  const listed = roles.filter((r) => r.visibility === "listed").length;
  const liveCount = (items: { status: string }[]) => {
    const live = items.filter((i) => i.status === "live").length;
    return `${live} live, ${items.length - live} draft`;
  };

  const areas = [
    {
      href: "/website/roles",
      title: "Job roles",
      text: "Open roles on the Work With Us page",
      status: `${listed} listed, ${roles.length - listed} not listed`,
    },
    {
      href: "/website/news",
      title: "News",
      text: "Stories on the News page and homepage",
      status: liveCount(stories),
    },
    {
      href: "/website/blog",
      title: "Blog",
      text: "Posts and episodes on the Blog page and homepage",
      status: liveCount(posts),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Website"
        description="Content on learnspace.com.ng. Changes stay here until someone publishes; the website then updates in about a minute."
      />
      <PublishBar canPublish={can(viewer.access, "website", "editor")} />
      <ul className="grid gap-4 md:grid-cols-3">
        {areas.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="group block h-full">
              <Card className="flex h-full flex-col gap-2 p-5 transition-colors group-hover:border-cobalt-200">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink-strong">{a.title}</span>
                  <ArrowRight size={16} className="text-subtle group-hover:text-cobalt-600" aria-hidden="true" />
                </span>
                <span className="text-sm text-subtle">{a.text}</span>
                {a.status && <span className="mt-auto pt-2 text-sm font-medium text-ink">{a.status}</span>}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
