import type { Metadata } from "next";
import Link from "next/link";
import { listNotifications, markAllRead } from "@learnspace/bookings";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const items = await listNotifications(viewer.id);
  // Opening the page reads them; they stay highlighted on this visit
  if (items.some((n) => !n.readAt)) await markAllRead(viewer.id);

  return (
    <>
      <SiteHeader />
      <main>
        <PageTitle title="Notifications" back="/" />
        <Container className="pt-2">
          <div className="mx-auto max-w-[760px]">
            {items.length === 0 ? (
              <EmptyState title="All caught up!" text="You do not have any notifications right now." />
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className="flex flex-col gap-3 border-b border-line py-6">
                    <h2
                      className={`flex items-center gap-3 text-lg font-bold ${n.readAt ? "pl-3 text-muted" : "text-ink-strong"}`}
                    >
                      {!n.readAt && <span className="size-1.5 rounded-full bg-green" aria-label="New" />}
                      {n.title}
                    </h2>
                    <p className={`text-base ${n.readAt ? "pl-3 text-muted" : "text-ink-strong"}`}>{n.body}</p>
                    {n.bookingRef && (
                      <Link href={`/bookings/${n.bookingRef}`} className="self-start">
                        <Badge>{n.bookingRef}</Badge>
                      </Link>
                    )}
                    <p className="text-sm font-semibold text-ink-strong">{formatDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
