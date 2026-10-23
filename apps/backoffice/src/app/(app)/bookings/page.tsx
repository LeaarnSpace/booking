import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarX2, ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatDuration, formatSlot } from "@/lib/bookings/format";
import { countBookingsByTab, listBookings, listExpiringHolds, listRooms } from "@/lib/bookings/store";
import { BOOKING_TABS, type BookingTab, type BookingView } from "@/lib/bookings/types";
import { env } from "@/lib/env";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Bookings" };

const EMPTY: Record<BookingTab, string> = {
  pending: "No receipts waiting for review",
  holds: "No slots on hold",
  confirmed: "No confirmed bookings",
  closed: "No declined, cancelled or expired bookings",
  all: "No bookings yet",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; room?: string; q?: string }>;
}) {
  await requireSection("bookings");
  const params = await searchParams;
  const tab = (BOOKING_TABS.find((t) => t.id === params.tab)?.id ?? "pending") as BookingTab;
  const room = params.room ?? "";
  const q = params.q?.trim() ?? "";

  const [bookings, counts, rooms, expiring] = await Promise.all([
    listBookings({ tab, roomId: room || undefined, q }),
    countBookingsByTab(),
    listRooms(),
    listExpiringHolds(),
  ]);
  const tabHref = (id: BookingTab) => {
    const query = new URLSearchParams({ tab: id, ...(room && { room }), ...(q && { q }) });
    return `/bookings?${query}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description="Review payment receipts, keep an eye on holds and see what's coming up."
      />

      {expiring.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pending bg-pending-50 px-5 py-4">
          <p className="flex items-start gap-2 text-sm text-ink">
            <AlarmClock size={18} className="mt-px shrink-0 text-pending-ink" aria-hidden="true" />
            <span>
              <strong className="font-semibold">
                {expiring.length} {expiring.length === 1 ? "hold runs" : "holds run"} out within{" "}
                {formatDuration(env.booking.holdWarnMinutes * 60_000)}.
              </strong>{" "}
              Unless the customer uploads a receipt, the slot is released automatically.
            </span>
          </p>
          <Link href={tabHref("holds")} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Review holds
          </Link>
        </div>
      )}

      <nav aria-label="Booking status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1 rounded-lg bg-cobalt-50 p-1">
          {BOOKING_TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={tabHref(t.id)}
                aria-current={t.id === tab ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  t.id === tab ? "bg-white text-ink-strong shadow-[var(--shadow-card)]" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    t.id === tab ? "bg-cobalt-50 text-cobalt-600" : "text-subtle",
                  )}
                >
                  {counts[t.id]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="flex flex-wrap gap-3" role="search">
        <input type="hidden" name="tab" value={tab} />
        <select
          name="room"
          defaultValue={room}
          aria-label="Room"
          className="h-10 rounded-md border border-line bg-white px-3 text-sm text-ink"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <label className="relative order-first min-w-0 basis-full sm:order-none sm:max-w-sm sm:flex-1 sm:basis-auto">
          <span className="sr-only">Search</span>
          <Search size={16} className="absolute left-3 top-3 text-subtle" aria-hidden="true" />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Booking ref, name or email"
            className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-subtle"
          />
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {bookings.length === 0 ? (
        <EmptyState icon={CalendarX2} title={q || room ? "No bookings match" : EMPTY[tab]}>
          {(q || room) && (
            <Link href={`/bookings?tab=${tab}`} className="font-semibold text-cobalt-600">
              Clear the filters
            </Link>
          )}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          {/* Table on wide screens; stacked rows on tablets and phones */}
          <table className="hidden w-full text-sm lg:table">
            <thead className="bg-sunk text-left text-xs font-semibold text-subtle">
              <tr>
                <th className="px-5 py-3">Booking ref</th>
                <th className="px-3 py-3">Guest</th>
                <th className="px-3 py-3">Room</th>
                <th className="px-3 py-3">Date & time</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.ref} className="border-t border-line-soft">
                  <td className="px-5 py-4 font-medium tabular-nums text-ink">{b.ref}</td>
                  <td className="px-3 py-4">
                    <Guest booking={b} />
                  </td>
                  <td className="px-3 py-4 text-ink">{b.room.name}</td>
                  <td className="px-3 py-4 text-subtle">
                    {formatSlot(b.start, b.end)}
                    {b.status === "hold" && (
                      <span className="block text-xs">Hold ends in {formatDuration(b.holdLeftMs!)}</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={b.status} expiring={b.holdExpiring} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/bookings/${b.ref}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                      View<span className="sr-only"> {b.ref}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line-soft lg:hidden">
            {bookings.map((b) => (
              <li key={b.ref}>
                <Link href={`/bookings/${b.ref}`} className="flex items-center gap-3 px-4 py-4 hover:bg-sunk">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Guest booking={b} />
                      <StatusBadge status={b.status} expiring={b.holdExpiring} />
                    </div>
                    <p className="mt-1 text-sm text-ink">{b.room.name}</p>
                    <p className="text-xs text-subtle">
                      {formatSlot(b.start, b.end)} · {b.ref}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Guest({ booking }: { booking: BookingView }) {
  return (
    <span className="flex items-center gap-2 font-medium text-ink">
      {booking.customer.name}
      {booking.kind === "staff" && <Badge tone="cobalt">Staff</Badge>}
    </span>
  );
}
