import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PickHeading } from "@/components/schedule/pick-heading";
import { Footer } from "@/components/shell/footer";
import { Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { ResourceCard } from "@/components/ui/resource-card";
import { listSpaces } from "@/lib/catalog";
import { photoUrls } from "@/lib/storage";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Book a space" };

/** "What would you like to book?": the spaces this person can book */
export default async function BookStartPage() {
  const viewer = await requireViewer("/book");
  const spaces = await listSpaces({ isStaff: viewer.isStaff });
  // Only one space to choose from: go straight to it
  if (spaces.length === 1) redirect(`/book/${spaces[0].id}`);
  const covers = await Promise.all(spaces.map(async (s) => (await photoUrls(s.photos))[0]?.url ?? null));

  return (
    <>
      <SiteHeader />
      <main className="bg-[#d9e3f3]/60 pb-12">
        <Container className="flex flex-col gap-6 pt-6 md:pt-14">
          <PickHeading text="Pick a room or service to view its availability and book a slot." />
          <div className="grid gap-3 md:grid-cols-2 md:gap-6">
            {spaces.map((s, i) => (
              <ResourceCard
                key={s.id}
                href={`/book/${s.id}`}
                title={s.name}
                text={s.tagline}
                fromRate={s.fromRate}
                photo={covers[i]}
                action="Book"
                className="md:min-h-[278px]"
              />
            ))}
          </div>
        </Container>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
