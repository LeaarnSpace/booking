import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Pencil, Plus } from "lucide-react";
import { listCategories, listRoles } from "@learnspace/website-content";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryEditor } from "@/components/website/category-editor";
import { PublishBar } from "@/components/website/publish-bar";
import { formatIsoDate } from "@/lib/bookings/format";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";
import { RoleControls } from "./role-controls";

export const metadata: Metadata = { title: "Job roles" };

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const viewer = await requireSection("website");
  const canEdit = can(viewer.access, "website", "editor");
  const [roles, teams, { saved }] = await Promise.all([listRoles(), listCategories("team"), searchParams]);
  const listed = roles.filter((r) => r.visibility === "listed").length;
  const linkOnly = roles.filter((r) => r.visibility === "link").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job roles"
        description="Open roles on the website’s Work With Us page, each with its own page and job description."
        actions={
          canEdit && (
            <Link href="/website/roles/new" className={buttonStyles()}>
              <Plus size={16} aria-hidden="true" /> Add role
            </Link>
          )
        }
      />

      <PublishBar canPublish={canEdit} />
      {saved && (
        <p role="status" className="text-sm text-confirmed-ink">
          Role saved. Publish when you’re ready for it to show on the website.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="roles-heading" className="flex flex-col gap-3">
          <h2 id="roles-heading" className="text-sm font-semibold text-subtle">
            {roles.length
              ? `${listed} listed${linkOnly ? `, ${linkOnly} link only` : ""}, ${roles.length - listed - linkOnly} hidden. Listed in this order.`
              : "Roles"}
          </h2>
          {roles.length === 0 ? (
            <EmptyState icon={BriefcaseBusiness} title="No roles yet">
              {canEdit ? "Add a role and publish to show it on the website." : "Nothing has been added yet."}
            </EmptyState>
          ) : (
            <Card>
              <ul className="divide-y divide-line-soft">
                {roles.map((r, i) => (
                  <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className={r.visibility === "hidden" ? "font-semibold text-subtle" : "font-semibold text-ink"}>
                        {r.title}
                      </p>
                      <p className="text-sm text-subtle">
                        {r.team} · {r.employmentType} · {r.location} · {r.arrangement} · Posted{" "}
                        {formatIsoDate(r.posted)}
                        {r.closesOn && ` · Closes ${formatIsoDate(r.closesOn)}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <RoleControls
                        key={`${r.id}-${r.visibility}`}
                        id={r.id}
                        title={r.title}
                        visibility={r.visibility}
                        first={i === 0}
                        last={i === roles.length - 1}
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <Link
                          href={`/website/roles/${r.id}`}
                          aria-label={`Edit ${r.title}`}
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

        <section aria-labelledby="teams-heading" className="flex flex-col gap-3">
          <h2 id="teams-heading" className="text-sm font-semibold text-subtle">
            Teams: the website’s filters, in this order
          </h2>
          <Card className="p-4 sm:px-5">
            <CategoryEditor
              kind="team"
              categories={teams}
              canEdit={canEdit}
              canDelete={can(viewer.access, "website", "manager")}
              usedLabel="role"
            />
          </Card>
        </section>
      </div>
    </div>
  );
}
