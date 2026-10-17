import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "News" };

export default async function Page() {
  await requireSection("website");
  return (
    <ComingSoon title="News" description="Stories on the News page and homepage.">
      Add stories with their source link, category and date.
    </ComingSoon>
  );
}
