import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Job roles" };

export default async function Page() {
  await requireSection("website");
  return (
    <ComingSoon title="Job roles" description="Open roles on the Work With Us page.">
      Add, edit and hide job roles. Publishing will rebuild the website automatically.
    </ComingSoon>
  );
}
