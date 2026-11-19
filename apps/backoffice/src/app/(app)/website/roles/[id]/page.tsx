import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRole, listCategories, rolePath } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { env } from "@/lib/env";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";
import { saveRole } from "../../actions";
import { RoleForm } from "../role-form";
import { DeleteRole } from "./delete-role";
import { JobLink } from "./job-link";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireSection("website", "editor");
  const { id } = await params;
  // Not a role id at all: treat like a missing role rather than asking the database
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [role, teams] = await Promise.all([getRole(id), listCategories("team")]);
  if (!role) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title={`Edit ${role.title}`} description="Changes reach the website at the next publish." />
      <JobLink
        key={role.code}
        id={role.id}
        url={new URL(rolePath(role.code), env.website.url).toString()}
        live={role.visibility !== "hidden"}
      />
      <RoleForm teams={teams} role={role} action={saveRole.bind(null, role.id)} submitLabel="Save changes" />
      {can(viewer.access, "website", "manager") && <DeleteRole id={role.id} title={role.title} />}
    </div>
  );
}
