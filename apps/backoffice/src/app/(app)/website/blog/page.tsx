import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Blog" };

export default async function Page() {
  await requireSection("website");
  return (
    <ComingSoon title="Blog" description="Posts and episodes on the Blog page.">
      Write posts, upload images and link podcast episodes.
    </ComingSoon>
  );
}
