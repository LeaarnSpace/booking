import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_TABS, listCustomerBookings, type CustomerTab } from "@learnspace/bookings";
import { lagosIsoDate } from "@learnspace/bookings/client";
import { StatusBadge } from "@/components/booking/status";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatShortDay, formatTimeRange } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "My Bookings" };

const TAB_LABELS: Record<CustomerTab, string> = {
  pending: "Pending",
  upcoming: "Upcoming",
  past: "Past",
  cancelled: "Cancelled",
};
const EMPTY: Record<CustomerTab, { title: string; text: string }> = {
  pending: { title: "Nothing to show here", text: "You have no pending booking" },
  upcoming: {
    title: "Nothing on the calendar right now",
    text: "Your next booking will show up here as soon as you make one.",
  },
  past: { title: "Nothing to show here", text: "Your past bookings will show up here." },
  cancelled: { title: "Nothing to show here", text: "You have no cancelled bookings" },
};

/** "This Week", "Next Week" or the month, for grouping */
function groupLabel(start: Date) {
  const days = (Date.parse(lagosIsoDate(start)) - Date.parse(lagosIsoDate(new Date()))) / 86_400_000;
  const weekday = (new Date().getUTCDay() + 6) % 7;
  if (days >= -weekday && days < 7 - weekday) return "This Week";
  if (days >= 7 - weekday && days < 14 - weekday) return "Next Week";
  return start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const viewer = await requireViewer("/bookings");
  const params = await searchParams;
  const tab: CustomerTab = (CUSTOMER_TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as CustomerTab)
    : "upcoming";
  const q = params.q?.slice(0, 60) ?? "";
  const bookings = await listCustomerBookings(viewer.id, tab, q);
  const groups = new Map<string, typeof bookings>();
  for (const b of bookings) groups.set(groupLabel(b.start), [...(groups.get(groupLabel(b.start)) ?? []), b]);

  return (
    <>
      <SiteHeader />
      <main>
        <PageTitle title="My Bookings" back="/" />
        <Container className="flex flex-col gap-6 pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <ButtonLink href="/book" className="w-52 md:order-2">
              New Booking{" "}
              <span aria-hidden className="text-2xl font-light leading-none">
                +
              </span>
            </ButtonLink>
            <nav aria-label="Booking status" className="flex w-fit gap-1 overflow-x-auto rounded-md bg-blue-100 p-2">
              {CUSTOMER_TABS.map((t) => (
                <Link
                  key={t}
                  href={`/bookings?tab=${t}`}
                  aria-current={t === tab ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-base tracking-[0.014em] text-ink-strong",
                    t === tab && "bg-white",
                  )}
                >
                  {TAB_LABELS[t]}
                </Link>
              ))}
            </nav>
          </div>
          <form className="relative md:max-w-[480px]">
            <input type="hidden" name="tab" value={tab} />
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 stroke-subtle"
              fill="none"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search"
              aria-label="Search bookings by reference or space"
              className="h-[52px] w-full rounded-md border border-line bg-white pl-11 pr-4 text-base text-ink placeholder:text-placeholder"
            />
          </form>

          {bookings.length === 0 ? (
            <EmptyState
              {...(q
                ? {
                    title: "No results on this page",
                    text: `Nothing matches “${q}”. Try a booking reference or space name.`,
                  }
                : EMPTY[tab])}
            />
          ) : (
            [...groups].map(([label, items]) => (
              <section key={label} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold tracking-[0.012em] text-muted">{label}</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((b) => (
                    <article key={b.ref} className="flex flex-col gap-3 rounded-md border border-line bg-sunk p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold tracking-[0.014em] text-ink-strong">
                          {b.serviceName ?? b.spaceName}
                        </h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <ul className="flex flex-col gap-1.5 text-sm text-subtle">
                        <li className="flex items-center gap-1.5">
                          <Icon name="calendar-small" size={16} className="opacity-60" /> {formatShortDay(b.start)}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="clock" size={16} /> {formatTimeRange(b.start, b.end)}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <PinIcon /> {b.spaceName}
                        </li>
                      </ul>
                      <p className="text-sm text-ink-strong">Booking ref: {b.ref}</p>
                      <div className="flex gap-3">
                        {(b.status === "hold" || b.status === "pending" || b.status === "confirmed") &&
                          b.start > new Date() && (
                            <ButtonLink href={`/bookings/${b.ref}/cancel`} variant="danger" className="flex-1">
                              Cancel
                            </ButtonLink>
                          )}
                        <ButtonLink
                          href={b.status === "hold" ? `/bookings/${b.ref}/pay` : `/bookings/${b.ref}`}
                          className="flex-1"
                        >
                          {b.status === "hold" ? "Pay now" : "View details"}
                        </ButtonLink>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </Container>
      </main>
    </>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-placeholder">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}
