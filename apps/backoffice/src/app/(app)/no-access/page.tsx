import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { SECTIONS } from "@/lib/sections";
import { listTeamManagers } from "@learnspace/auth-staff";

export const metadata: Metadata = { title: "No access" };

export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const label = SECTIONS.find((s) => s.id === section)?.label;
  const managers = await listTeamManagers();
  return (
    <EmptyState icon={ShieldOff} title={label ? `You don't have access to ${label}` : "You don't have access to that"}>
      <p>
        {managers.length ? (
          <>
            A team manager can give you access:{" "}
            {managers.map((m, i) => (
              <span key={m}>
                {i > 0 && ", "}
                <a className="font-semibold text-cobalt-600" href={`mailto:${m}`}>
                  {m}
                </a>
              </span>
            ))}
            .
          </>
        ) : (
          "Ask whoever manages the back office to give you access."
        )}
      </p>
      <Link href="/" className={buttonStyles({ variant: "secondary", className: "mt-5" })}>
        Back to overview
      </Link>
    </EmptyState>
  );
}
