import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Projects" };

export default async function Page() {
  await requireSection("projects");
  return (
    <ComingSoon title="Projects" description="Key numbers and links for the projects we run.">
      A dashboard of the numbers you check each week, with links out to each project.
    </ComingSoon>
  );
}
