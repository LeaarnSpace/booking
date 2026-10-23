import { listSpaces } from "@learnspace/bookings";
import { HeroGallery } from "@/components/hero-gallery";
import { Footer } from "@/components/shell/footer";
import { Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { ButtonLink } from "@/components/ui/button";
import { FaqList } from "@/components/ui/faq";
import { ResourceCard } from "@/components/ui/resource-card";
import { GENERAL_FAQS, HOW_TO_BOOK } from "@/lib/content";
import { photoUrls } from "@/lib/storage";
import { getViewer } from "@/lib/viewer";

const HERO = [
  { url: "/hero/gallery-1.jpg", alt: "A presenter speaking to a team" },
  { url: "/hero/gallery-2.jpg", alt: "A podcast recording in the studio" },
  { url: "/hero/gallery-3.jpg", alt: "A photo shoot in the creative space" },
];

export default async function Home() {
  const viewer = await getViewer();
  const spaces = await listSpaces({ isStaff: viewer?.isStaff ?? false });
  const covers = await Promise.all(spaces.map(async (s) => (await photoUrls(s.photos))[0]?.url ?? null));

  return (
    <>
      <SiteHeader overlay />
      <main>
        <section className="relative flex h-[min(100svh,932px)] min-h-[560px] items-end md:mt-[120px] md:h-[556px] md:min-h-0 md:items-center">
          <HeroGallery photos={HERO} />
          <Container className="relative pb-24 md:pb-0">
            <div className="flex max-w-[576px] flex-col gap-12">
              <div className="flex flex-col gap-2 text-white md:gap-4">
                <h1 className="text-2xl font-bold tracking-[0.012em] md:text-5xl md:leading-tight">
                  Workspace Solutions<span className="hidden md:inline"> for Innovators</span>
                </h1>
                <p className="text-base font-semibold tracking-[0.014em] md:font-medium">
                  Seamlessly book professional spaces designed for high-impact collaboration and professional production
                </p>
              </div>
              <ButtonLink href="#spaces" className="w-full md:w-auto md:self-start">
                Explore Spaces
              </ButtonLink>
            </div>
          </Container>
        </section>

        <section id="spaces" className="scroll-mt-20 bg-blue-100 py-12 md:py-14">
          <Container className="flex flex-col gap-12">
            <div className="flex flex-col gap-3 text-ink">
              <h2 className="text-2xl font-bold tracking-[0.012em]">Available Spaces</h2>
              <p className="text-base tracking-[0.014em]">
                Specialized environments for every professional requirement.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-6">
              {spaces.map((s, i) => (
                <ResourceCard
                  key={s.id}
                  href={`/spaces/${s.id}`}
                  title={s.name}
                  text={s.tagline}
                  fromRate={s.fromRate}
                  photo={covers[i]}
                  className="md:min-h-[400px]"
                />
              ))}
            </div>
          </Container>
        </section>

        <section className="py-12 md:bg-sunk md:py-20">
          <Container className="grid gap-8 md:grid-cols-2 md:gap-x-10">
            <div className="flex flex-col gap-3 text-ink md:contents">
              <h2 className="text-2xl font-bold tracking-[0.012em] md:text-[32px]">How to Book</h2>
              <p className="text-base tracking-[0.014em] md:self-center">
                Six simple steps to secure your perfect workspace.
              </p>
            </div>
            <ol className="md:col-span-2">
              {HOW_TO_BOOK.map((step, i) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-3 border-b border-line py-5 last:border-0 md:grid md:grid-cols-2 md:items-center md:gap-10"
                >
                  <span className="flex items-center gap-4">
                    <span className="text-sm tracking-[0.014em] text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-lg font-bold tracking-[0.012em] text-ink-strong">{step.title}</span>
                  </span>
                  <span className="text-base tracking-[0.014em] text-ink-strong md:text-sm md:text-muted">
                    {step.text}
                  </span>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section className="border-b border-line bg-green-50 py-12 md:py-20">
          <Container className="flex flex-col gap-8">
            <h2 className="text-xl font-bold tracking-[0.012em] text-ink md:text-[32px]">
              Frequently Asked Questions (FAQ)
            </h2>
            <FaqList faqs={GENERAL_FAQS} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
