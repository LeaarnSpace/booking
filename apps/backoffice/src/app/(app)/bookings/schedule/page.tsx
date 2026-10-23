import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatDate, formatTime, lagosIsoDate, lagosWeekStart, LAGOS_OFFSET_MS } from "@/lib/bookings/format";
import { listRooms, listScheduledBookings } from "@/lib/bookings/store";
import type { BookingView, Room } from "@/lib/bookings/types";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Schedule" };

const DAY = 24 * 60 * 60 * 1000;
const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "Africa/Lagos" });
const longDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Lagos",
});

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireSection("bookings");
  const { week } = await searchParams;
  const now = new Date();
  const requested = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? new Date(`${week}T12:00:00+01:00`) : now;
  const start = lagosWeekStart(Number.isNaN(requested.getTime()) ? now : requested);
  const end = new Date(start.getTime() + 7 * DAY);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY));
  const today = lagosIsoDate(now);

  const [rooms, bookings] = await Promise.all([listRooms(), listScheduledBookings(start, end)]);
  const on = (day: Date, room?: Room) =>
    bookings.filter((b) => lagosIsoDate(b.start) === lagosIsoDate(day) && (!room || b.roomId === room.id));
  const weekHref = (offset: number) => `/bookings/schedule?week=${lagosIsoDate(lagosWeekStart(start, offset))}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Schedule"
        description="Every booked and held slot, week by week. Declined, cancelled and expired bookings aren't shown."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-bold text-ink-strong">
          {formatDate(start)} – {formatDate(new Date(end.getTime() - DAY))}
        </p>
        <nav aria-label="Week" className="flex items-center gap-2">
          <Link href={weekHref(-1)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <ChevronLeft size={16} /> <span className="sr-only sm:not-sr-only">Previous</span>
          </Link>
          <Link href="/bookings/schedule" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            This week
          </Link>
          <Link href={weekHref(1)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <span className="sr-only sm:not-sr-only">Next</span> <ChevronRight size={16} />
          </Link>
        </nav>
      </div>

      <Legend />

      {/* Wide screens: rooms down the side, days across */}
      <Card className="hidden overflow-x-auto lg:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-sunk text-left text-xs font-semibold text-subtle">
              <th className="w-36 px-4 py-3">Room</th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className={cn("px-2 py-3", lagosIsoDate(d) === today && "text-cobalt-600")}
                  aria-current={lagosIsoDate(d) === today ? "date" : undefined}
                >
                  {dayLabel.format(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-t border-line-soft align-top">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                  {room.name}
                  {room.visibility === "staff" && (
                    <span className="block text-xs font-normal text-subtle">Staff only</span>
                  )}
                </th>
                {days.map((d) => {
                  const closed = room.hours[(new Date(d.getTime() + LAGOS_OFFSET_MS).getUTCDay() + 6) % 7] === null;
                  const items = on(d, room);
                  return (
                    <td
                      key={d.toISOString()}
                      className={cn("px-1.5 py-2", lagosIsoDate(d) === today && "bg-cobalt-50/40", closed && "bg-sunk")}
                    >
                      <ul className="flex flex-col gap-1.5">
                        {items.map((b) => (
                          <li key={b.ref}>
                            <Slot booking={b} />
                          </li>
                        ))}
                      </ul>
                      {closed && !items.length && <span className="block px-1 text-xs text-subtle">Closed</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Tablets and phones: one card per day */}
      <ol className="flex flex-col gap-4 lg:hidden">
        {days.map((d) => {
          const items = on(d);
          return (
            <li key={d.toISOString()}>
              <Card className="p-4">
                <h2
                  className={cn("text-sm font-bold", lagosIsoDate(d) === today ? "text-cobalt-600" : "text-ink-strong")}
                >
                  {longDay.format(d)}
                  {lagosIsoDate(d) === today && " · Today"}
                </h2>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-subtle">Nothing booked</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {items.map((b) => (
                      <li key={b.ref}>
                        <Slot booking={b} showRoom />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const TONE = {
  confirmed: "border-confirmed bg-confirmed-50 text-confirmed-ink",
  pending: "border-pending bg-pending-50 text-pending-ink",
  hold: "border-dashed border-cobalt-400 bg-white text-cobalt-700",
} as const;

function Slot({ booking, showRoom }: { booking: BookingView; showRoom?: boolean }) {
  const tone = TONE[booking.status as keyof typeof TONE];
  return (
    <Link
      href={`/bookings/${booking.ref}`}
      className={cn(
        "block rounded-md border-l-4 border px-2 py-1.5 text-xs transition-shadow hover:shadow-[var(--shadow-pop)]",
        tone,
      )}
    >
      <span className="block font-semibold tabular-nums">
        {formatTime(booking.start)}–{formatTime(booking.end)}
      </span>
      <span className="flex items-center gap-1 truncate">
        <span className="truncate">{booking.customer.name}</span>
        {booking.kind === "staff" && (
          <Badge tone="cobalt" className="px-1.5 py-0 text-[10px]">
            Staff
          </Badge>
        )}
      </span>
      {showRoom && <span className="block opacity-80">{booking.room.name}</span>}
    </Link>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-subtle" aria-label="Key">
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-sm border-l-4 border border-confirmed bg-confirmed-50" /> Confirmed
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-sm border-l-4 border border-pending bg-pending-50" /> Receipt waiting for review
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-sm border-l-4 border border-dashed border-cobalt-400 bg-white" /> On hold, no
        receipt yet
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-sm bg-sunk ring-1 ring-line" /> Closed
      </li>
    </ul>
  );
}
