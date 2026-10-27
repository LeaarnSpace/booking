import type { Metadata } from "next";
import { listSchedule } from "@learnspace/bookings";
import { addDays, lagosTime } from "@learnspace/bookings/client";
import { WeekPlanner } from "@/components/schedule/week-planner";
import { Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { listSpaces } from "@/lib/catalog";
import { pickDate, weekStart } from "@/lib/schedule";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Schedule" };

type Props = { searchParams: Promise<{ view?: string; date?: string }> };

export default async function SchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const viewer = await getViewer();
  const spaces = await listSpaces({ isStaff: viewer?.isStaff ?? false });
  const date = pickDate(params.date);
  const monday = weekStart(date);
  const entries = await listSchedule({
    spaceIds: spaces.map((s) => s.id),
    from: lagosTime(monday),
    to: lagosTime(addDays(monday, 7)),
    viewerId: viewer?.id ?? null,
  });

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="pt-4 md:pt-10">
          <WeekPlanner
            spaces={spaces.map((s) => ({
              id: s.id,
              name: s.name,
              minHours: s.minHours,
              hours: s.hours,
              closedDates: s.closedDates,
              closedOnPublicHolidays: s.closedOnPublicHolidays,
              services: s.services.map((v) => ({ id: v.id, name: v.name })),
            }))}
            entries={entries}
            monday={monday}
            date={date}
            view={params.view ?? "all"}
            signedIn={Boolean(viewer)}
          />
        </Container>
      </main>
    </>
  );
}
