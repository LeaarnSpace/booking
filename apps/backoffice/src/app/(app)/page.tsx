import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewer } from "@/lib/viewer";
import { ROLES, SECTIONS, can } from "@/lib/sections";
import { listTeamManagers } from "@learnspace/auth-staff";

export default async function OverviewPage() {
  const viewer = await requireViewer();
  const sections = SECTIONS.filter((s) => can(viewer.access, s.id));
  const firstName = viewer.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-subtle">{greeting()},</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-strong">{firstName}</h1>
      </div>

      {sections.length === 0 ? (
        <EmptyState icon={KeyRound} title="You don't have access to anything yet">
          <NoAccessHelp />
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => {
            const role = ROLES.find((r) => r.id === viewer.access[s.id])!;
            return (
              <li key={s.id}>
                <Link href={s.href} className="group block h-full">
                  <Card className="flex h-full flex-col gap-3 p-6 transition-shadow group-hover:shadow-[var(--shadow-pop)]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-ink-strong">{s.label}</h2>
                      <Badge tone="cobalt">{role.label}</Badge>
                    </div>
                    <p className="text-sm text-subtle">{s.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-cobalt-600">
                      Open <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Africa/Lagos" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

async function NoAccessHelp() {
  const managers = await listTeamManagers();
  return managers.length ? (
    <>
      Ask {managers.length === 1 ? "the team manager" : "a team manager"} to give you access:{" "}
      {managers.map((m, i) => (
        <span key={m}>
          {i > 0 && ", "}
          <a className="font-semibold text-cobalt-600" href={`mailto:${m}`}>
            {m}
          </a>
        </span>
      ))}
    </>
  ) : (
    <>No one manages access yet. Add your email to BOOTSTRAP_ADMIN_EMAILS to set yourself up as the first admin.</>
  );
}
