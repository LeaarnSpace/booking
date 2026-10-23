import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserX } from "lucide-react";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatMonth, formatSlot } from "@/lib/bookings/format";
import { getCustomer, listCustomers } from "@/lib/bookings/store";
import { env } from "@/lib/env";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  await requireSection("bookings");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const customers = await listCustomers(q);
  const selectedId = params.c ?? customers[0]?.id;
  const selected = selectedId ? await getCustomer(selectedId) : null;
  const href = (id: string) => `/bookings/customers?${new URLSearchParams({ c: id, ...(q && { q }) })}#customer`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Everyone with a booking-app account. Staff are recognised by their email domain, so they book for free."
      />

      <p className="text-sm text-subtle">
        Staff email domains:{" "}
        {env.booking.staffDomains.length ? (
          env.booking.staffDomains.map((d, i) => (
            <span key={d}>
              {i > 0 && ", "}
              <span className="font-semibold text-ink">@{d}</span>
            </span>
          ))
        ) : (
          <span className="font-semibold text-ink">none set</span>
        )}
      </p>

      <form role="search" className="max-w-sm">
        <label className="relative block">
          <span className="sr-only">Search customers</span>
          <Search size={16} className="absolute left-3 top-3 text-subtle" aria-hidden="true" />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-subtle"
          />
        </label>
      </form>

      {customers.length === 0 ? (
        <EmptyState icon={UserX} title={q ? "No customers match" : "No customers yet"}>
          {q ? (
            <Link href="/bookings/customers" className="font-semibold text-cobalt-600">
              Clear the search
            </Link>
          ) : (
            "People appear here after they sign up in the booking app."
          )}
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line-soft">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={href(c.id)}
                    aria-current={c.id === selected?.id ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3.5 transition-colors",
                      c.id === selected?.id ? "bg-cobalt-50" : "hover:bg-sunk",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-subtle">{c.email}</p>
                    </div>
                    {c.isStaff ? <Badge tone="cobalt">Staff</Badge> : <Badge>Guest</Badge>}
                    <span className="hidden w-20 text-right text-xs text-subtle sm:block">
                      {c.bookingCount} booking{c.bookingCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {selected && (
            <div id="customer" className="flex scroll-mt-20 flex-col gap-6">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-4">
                  <h2 className="text-lg font-bold text-ink-strong">{selected.name}</h2>
                  {selected.isStaff ? <Badge tone="cobalt">Staff</Badge> : <Badge>Guest</Badge>}
                </div>
                <dl className="flex flex-col gap-3 pt-4 text-sm">
                  <Row label="Email">
                    <a href={`mailto:${selected.email}`} className="text-cobalt-600">
                      {selected.email}
                    </a>
                  </Row>
                  <Row label="Phone">{selected.phone ?? <span className="text-subtle">Not given</span>}</Row>
                  <Row label="Type">{selected.isStaff ? "Staff (from email domain)" : "Guest"}</Row>
                  <Row label="Member since">{formatMonth(selected.createdAt)}</Row>
                </dl>
              </Card>

              <Card className="p-5">
                <h2 className="text-base font-bold text-ink-strong">Bookings</h2>
                {selected.bookings.length === 0 ? (
                  <p className="pt-3 text-sm text-subtle">No bookings yet.</p>
                ) : (
                  <ul className="flex flex-col pt-2">
                    {selected.bookings.map((b) => (
                      <li key={b.ref}>
                        <Link
                          href={`/bookings/${b.ref}`}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-sunk"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink">{b.room.name}</span>
                            <span className="block text-xs text-subtle">{formatSlot(b.start, b.end)}</span>
                          </span>
                          <StatusBadge status={b.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  );
}
