import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/shell/footer";
import { Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { AvailabilityBar, CommonQuestions, DetailHero, DetailSection, IncludedList } from "@/components/space-detail";
import { ResourceCard } from "@/components/ui/resource-card";
import { getSpace } from "@/lib/catalog";
import { photoUrls } from "@/lib/storage";
import { getViewer } from "@/lib/viewer";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const viewer = await getViewer();
  return getSpace(id, { isStaff: viewer?.isStaff ?? false });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const space = await load((await params).id);
  return { title: space?.name ?? "Space not found" };
}

export default async function SpacePage({ params }: Props) {
  const space = await load((await params).id);
  if (!space) notFound();
  const [photos, ...servicePhotos] = await Promise.all([
    photoUrls(space.photos),
    ...space.services.map((s) => photoUrls(s.photos)),
  ]);
  const hasServices = space.services.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="pb-24 md:pb-16">
        <DetailHero title={space.name} visibility={space.visibility} photos={photos} back="/" />
        <Container className="flex flex-col gap-6 pt-6 md:gap-12 md:pt-14">
          <DetailSection title="About this space">
            <p className="max-w-[760px] text-base tracking-[0.014em] text-ink-strong">{space.description}</p>
          </DetailSection>

          {hasServices ? (
            <DetailSection title="Choose a service">
              <p className="text-base tracking-[0.014em] text-ink-strong">
                Each service has its own listing. Pick one to see its full details and availability.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-6">
                {space.services.map((s, i) => (
                  <ResourceCard
                    key={s.id}
                    href={`/spaces/${space.id}/${s.id}`}
                    title={s.name}
                    text={s.description}
                    fromRate={s.hourlyRate}
                    photo={servicePhotos[i][0]?.url ?? null}
                  />
                ))}
              </div>
            </DetailSection>
          ) : (
            space.included.length > 0 && (
              <DetailSection title="What’s included?">
                <IncludedList items={space.included} />
              </DetailSection>
            )
          )}

          <CommonQuestions faqs={space.faqs} />
          {!hasServices && <AvailabilityBar rate={space.hourlyRate} href={`/schedule?view=${space.id}`} />}
        </Container>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
