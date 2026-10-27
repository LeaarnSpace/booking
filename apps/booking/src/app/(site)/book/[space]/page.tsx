import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lagosIsoDate } from "@learnspace/bookings/client";
import { PickHeading } from "@/components/schedule/pick-heading";
import { BackButton, Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { ResourceCard } from "@/components/ui/resource-card";
import { getSpace } from "@/lib/catalog";
import { photoUrls } from "@/lib/storage";
import { requireViewer } from "@/lib/viewer";
import { getDayAvailability } from "../actions";
import { BookingWizard } from "./wizard";

export const metadata: Metadata = { title: "Book" };

type Props = {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ service?: string; start?: string; hours?: string }>;
};

/**
 * Booking a space: pick a service first when the space has several, then Add Details. A time chosen on the
 * Schedule page arrives as ?start=…&hours=… and is already selected.
 */
export default async function BookPage({ params, searchParams }: Props) {
  const { space: spaceId } = await params;
  const { service: serviceId, start, hours } = await searchParams;
  const query = new URLSearchParams({
    ...(serviceId ? { service: serviceId } : {}),
    ...(start ? { start } : {}),
    ...(hours ? { hours } : {}),
  });
  const viewer = await requireViewer(`/book/${spaceId}?${query}`);
  const space = await getSpace(spaceId, { isStaff: viewer.isStaff });
  if (!space) notFound();
  const service = space.services.find((s) => s.id === serviceId) ?? null;

  // A space with services is booked for one of them: choose it first
  if (space.services.length && !service) {
    const photos = await Promise.all(space.services.map(async (s) => (await photoUrls(s.photos))[0]?.url ?? null));
    const keep = new URLSearchParams({ ...(start ? { start } : {}), ...(hours ? { hours } : {}) });
    return (
      <>
        <SiteHeader />
        <main className="bg-[#d9e3f3]/60 pb-12">
          <Container className="flex flex-col gap-6 pt-6 md:pt-14">
            <div className="flex items-start gap-3">
              <BackButton href="/book" className="mt-0.5" />
              <PickHeading text="Pick a service to view its availability and book a slot." />
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-6">
              {space.services.map((s, i) => (
                <ResourceCard
                  key={s.id}
                  href={`/book/${space.id}?${new URLSearchParams({ service: s.id, ...Object.fromEntries(keep) })}`}
                  title={s.name}
                  text={s.description}
                  fromRate={s.hourlyRate}
                  photo={photos[i]}
                  action="Book"
                  className="md:min-h-[238px]"
                />
              ))}
            </div>
          </Container>
        </main>
      </>
    );
  }

  const startDate = start && !Number.isNaN(Date.parse(start)) ? new Date(start) : null;
  const date = lagosIsoDate(startDate && startDate > new Date() ? startDate : new Date());
  const availability = await getDayAvailability(space.id, date);
  const length = Math.min(Math.max(Number(hours) || space.minHours || 1, 1), 24);

  return (
    <>
      <SiteHeader />
      <BookingWizard
        back={space.services.length ? `/book/${space.id}` : "/book"}
        viewer={{ name: viewer.name, email: viewer.email, phone: viewer.phone ?? "", isStaff: viewer.isStaff }}
        space={{
          id: space.id,
          name: space.name,
          capacity: space.capacity,
          minHours: space.minHours,
          hourlyRate: space.hourlyRate,
          discounts: space.discounts,
          hours: space.hours,
          closedDates: space.closedDates,
          closedOnPublicHolidays: space.closedOnPublicHolidays,
          addOns: space.addOns.map((a) => ({ id: a.id, name: a.name, description: a.description, price: a.price })),
        }}
        service={service ? { id: service.id, name: service.name, hourlyRate: service.hourlyRate } : null}
        initial={{ date, availability, start: startDate?.toISOString() ?? null, hours: length }}
      />
    </>
  );
}
