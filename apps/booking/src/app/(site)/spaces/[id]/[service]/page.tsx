import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/shell/footer";
import { Container } from "@/components/shell/page";
import { AvailabilityBar, CommonQuestions, DetailHero, DetailSection, IncludedList } from "@/components/space-detail";
import { getSpace } from "@/lib/catalog";
import { photoUrls } from "@/lib/storage";
import { getViewer } from "@/lib/viewer";

type Props = { params: Promise<{ id: string; service: string }> };

async function load({ id, service }: { id: string; service: string }) {
  const viewer = await getViewer();
  const space = await getSpace(id, { isStaff: viewer?.isStaff ?? false });
  const found = space?.services.find((s) => s.id === service);
  return space && found ? { space, service: found } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(await params);
  return { title: found ? `${found.service.name} · ${found.space.name}` : "Service not found" };
}

export default async function ServicePage({ params }: Props) {
  const found = await load(await params);
  if (!found) notFound();
  const { space, service } = found;
  const photos = await photoUrls(service.photos.length ? service.photos : space.photos);

  return (
    <>
      <main className="pb-24 md:pb-16">
        <DetailHero title={service.name} visibility={space.visibility} photos={photos} back={`/spaces/${space.id}`} />
        <Container className="flex flex-col gap-6 pt-6 md:gap-12 md:pt-14">
          <DetailSection title="About this space">
            <p className="max-w-[760px] text-base tracking-[0.014em] text-ink-strong">{service.description}</p>
          </DetailSection>
          {service.included.length > 0 && (
            <DetailSection title="What’s included?">
              <IncludedList items={service.included} />
            </DetailSection>
          )}
          <CommonQuestions faqs={service.faqs} />
          <AvailabilityBar rate={service.hourlyRate} href={`/schedule?view=${space.id}:${service.id}`} />
        </Container>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}
