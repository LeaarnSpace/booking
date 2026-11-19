import type { Metadata } from "next";
import { JOB_DESCRIPTION_TEMPLATE, listCategories } from "@learnspace/website-content";
import { PageHeader } from "@/components/ui/page-header";
import { lagosIsoDate } from "@/lib/bookings/format";
import { requireSection } from "@/lib/viewer";
import { saveRole } from "../../actions";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Add role" };

export default async function NewRolePage() {
  await requireSection("website", "editor");
  const teams = await listCategories("team");
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Add role" description="It goes to the top of the list. Publish to show it on the website." />
      <RoleForm
        teams={teams}
        action={saveRole.bind(null, null)}
        submitLabel="Add role"
        role={{
          title: "",
          teamId: "",
          posted: lagosIsoDate(new Date()),
          location: "Lagos",
          arrangement: "Hybrid",
          employmentType: "Full-time",
          salary: null,
          reportsTo: null,
          closesOn: null,
          summary: "",
          description: JOB_DESCRIPTION_TEMPLATE,
          applyUrl: null,
          applyEmail: null,
          visibility: "listed",
        }}
      />
    </div>
  );
}
