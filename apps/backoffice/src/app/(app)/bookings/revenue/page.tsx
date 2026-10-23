import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth, naira } from "@/lib/bookings/format";
import { revenueSummary } from "@/lib/bookings/store";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Revenue" };

export default async function RevenuePage() {
  await requireSection("bookings");
  const s = await revenueSummary();
  const topRoom = Math.max(1, ...s.byRoom.map((r) => r.amount));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue"
        description={`Confirmed bookings in ${formatMonth(s.monthStart)}, counted by the date of the booking.`}
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue this month" value={naira(s.revenue)}>
          <Change now={s.revenue} before={s.revenueLastMonth} />
        </Stat>
        <Stat label="Confirmed bookings" value={String(s.confirmed)}>
          <span className="text-subtle">{s.confirmedThisWeek} confirmed in the last 7 days</span>
        </Stat>
        <Stat label="Waiting for review" value={String(s.pendingReview)}>
          <Link href="/bookings?tab=pending" className="font-semibold text-cobalt-600">
            Review receipts
          </Link>
        </Stat>
        <Stat label="Average paid booking" value={naira(s.averagePaid)}>
          <Change now={s.averagePaid} before={s.averagePaidLastMonth} />
        </Stat>
      </ul>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-base font-bold text-ink-strong">Revenue by room</h2>
        <ul className="flex flex-col gap-4">
          {s.byRoom.map(({ room, amount }) => (
            <li key={room.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-ink">{room.name}</span>
                <span className="font-semibold tabular-nums text-ink">{naira(amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-sunk" aria-hidden="true">
                <div className="h-full rounded-full bg-cobalt-600" style={{ width: `${(amount / topRoom) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="px-5 pt-5 text-base font-bold text-ink-strong">Confirmed this month</h2>
        {s.payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-subtle">Nothing confirmed yet this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[560px] text-sm">
              <thead className="bg-sunk text-left text-xs font-semibold text-subtle">
                <tr>
                  <th className="px-5 py-3">Booking ref</th>
                  <th className="px-3 py-3">Guest</th>
                  <th className="px-3 py-3">Room</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.payments.map((b) => (
                  <tr key={b.ref} className="border-t border-line-soft">
                    <td className="px-5 py-3.5 tabular-nums">
                      <Link href={`/bookings/${b.ref}`} className="font-medium text-cobalt-600 hover:underline">
                        {b.ref}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-ink">{b.customer.name}</td>
                    <td className="px-3 py-3.5 text-ink">{b.room.name}</td>
                    <td className="px-3 py-3.5 text-subtle">{formatDate(b.start)}</td>
                    <td className="px-5 py-3.5 text-right font-medium tabular-nums text-ink">
                      {b.kind === "staff" ? <span className="text-subtle">Free (staff)</span> : naira(b.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <li>
      <Card className="flex h-full flex-col gap-2 p-5">
        <p className="text-sm text-subtle">{label}</p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-ink-strong">{value}</p>
        <p className="text-xs">{children}</p>
      </Card>
    </li>
  );
}

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-subtle">Nothing to compare with last month</span>;
  const percent = Math.round(((now - before) / before) * 100);
  return (
    <span className={cn(percent >= 0 ? "text-confirmed-ink" : "text-error-ink")}>
      {percent >= 0 ? "+" : "−"}
      {Math.abs(percent)}% vs last month
    </span>
  );
}
