import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireSection } from "@/lib/viewer";
import { ROLES, SECTIONS, can } from "@/lib/sections";
import { listStaff } from "@learnspace/auth-staff";
import { env } from "@/lib/env";
import { AccessSelect, AddPersonForm, RemovePersonButton } from "./team-controls";

export const metadata: Metadata = { title: "Team & access" };

export default async function TeamPage() {
  const viewer = await requireSection("team");
  const canManage = can(viewer.access, "team", "manager");
  const people = await listStaff();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Team & access"
        description="Everyone signs in with their Learn Space Google account. Each person gets a role in each section; no role means the section is hidden from them."
      />

      {canManage && (
        <AddPersonForm
          sections={SECTIONS.map(({ id, label }) => ({ id, label }))}
          domain={env.allowedDomains[0] ?? ""}
        />
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-xs font-bold uppercase tracking-[0.06em] text-subtle">
              <th className="px-5 py-3">Person</th>
              {SECTIONS.map((s) => (
                <th key={s.id} className="px-3 py-3">
                  {s.label}
                </th>
              ))}
              {canManage && <th className="px-3 py-3" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.email} className="border-b border-line-soft last:border-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name ?? p.email} image={p.image} size={36} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-ink">
                        <span className="truncate">{p.name ?? p.email.split("@")[0]}</span>
                        {p.email === viewer.email && <Badge tone="cobalt">You</Badge>}
                        {!p.joined && <Badge tone="beam">Not signed in yet</Badge>}
                      </p>
                      <p className="truncate text-xs text-subtle">{p.email}</p>
                    </div>
                  </div>
                </td>
                {SECTIONS.map((s) => (
                  <td key={s.id} className="px-3 py-4">
                    {canManage ? (
                      <AccessSelect
                        key={p.access[s.id] ?? "none"}
                        email={p.email}
                        section={s.id}
                        sectionLabel={s.label}
                        role={p.access[s.id] ?? "none"}
                      />
                    ) : (
                      <span className={p.access[s.id] ? "text-ink" : "text-subtle"}>
                        {ROLES.find((r) => r.id === p.access[s.id])?.label ?? "No access"}
                      </span>
                    )}
                  </td>
                ))}
                {canManage && (
                  <td className="px-3 py-4 text-right">
                    {p.email !== viewer.email && <RemovePersonButton email={p.email} name={p.name ?? p.email} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.id} className="rounded-md bg-white p-4 ring-1 ring-line-soft">
            <dt className="font-bold text-ink">{r.label}</dt>
            <dd className="text-subtle">{r.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
