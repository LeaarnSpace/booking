import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Website" };

export default async function Page() {
  await requireSection("website");
  return (
    <ComingSoon title="Website" description="Content shown on learnspace.com.ng.">
      Roles, news stories and blog posts will be edited here and published to the website.
    </ComingSoon>
  );
}
