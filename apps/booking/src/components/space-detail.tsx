import type { Faq, Visibility } from "@learnspace/bookings/client";
import { HeroGallery } from "@/components/hero-gallery";
import { BackButton, Container } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FaqList } from "@/components/ui/faq";
import { Icon } from "@/components/ui/icon";
import { naira } from "@/lib/format";
import type { PhotoView } from "@/lib/storage";

/** Photo header with back button, who-can-book badge and name */
export function DetailHero({
  title,
  visibility,
  photos,
  back,
}: {
  title: string;
  visibility: Visibility;
  photos: PhotoView[];
  back: string;
}) {
  return (
    <section className="relative h-[358px] md:h-[556px]">
      <HeroGallery photos={photos} />
      <Container className="relative flex h-full flex-col justify-between pb-6 pt-11 md:pb-14">
        <BackButton href={back} />
        <div className="flex flex-col items-start gap-1">
          <Badge>{visibility === "staff" ? "Staff only" : "General"}</Badge>
          <h1 className="text-2xl font-bold tracking-[0.012em] text-white md:text-5xl">{title}</h1>
        </div>
      </Container>
    </section>
  );
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold tracking-[0.012em] text-ink-strong">{title}</h2>
      {children}
    </section>
  );
}

export function IncludedList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1 md:grid md:grid-cols-2 md:gap-x-10">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-2.5 border-b border-line pb-4 pt-2 text-base font-medium tracking-[0.014em] text-ink-strong"
        >
          <Icon name="check-ring" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CommonQuestions({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <section className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold tracking-[0.012em] text-ink-strong">Common Questions</h2>
      <FaqList faqs={faqs} />
    </section>
  );
}

/** Price and "View Availability", fixed above the bottom bar on phones, inline on wider screens */
export function AvailabilityBar({ rate, href }: { rate: number; href: string }) {
  return (
    <div className="fixed inset-x-0 bottom-[72px] z-20 border-t border-line bg-white md:static md:border-0">
      <Container className="flex items-center justify-between gap-4 py-3 md:justify-start md:gap-10 md:py-0">
        <p className="flex flex-col gap-1 text-sm tracking-[0.014em] text-ink-strong">
          Starting from:
          <span className="font-bold">
            {naira(rate)}
            <span className="text-muted">/hr</span>
          </span>
        </p>
        <ButtonLink href={href} className="w-[242px] max-w-[60%]">
          View Availability
        </ButtonLink>
      </Container>
    </div>
  );
}
