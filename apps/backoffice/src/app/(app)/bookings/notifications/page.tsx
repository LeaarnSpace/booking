import type { Metadata } from "next";
import Link from "next/link";
import { getMessageSettings, listFailedMessages } from "@learnspace/bookings";
import { MESSAGES } from "@learnspace/bookings/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/bookings/format";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";
import { FailedActions, MessageSwitch } from "./message-switch";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireSection("bookings");
  const canEdit = can(viewer.access, "bookings", "editor");
  const [settings, failed] = await Promise.all([getMessageSettings(), listFailedMessages()]);
  const label = (id: string) => MESSAGES.find((m) => m.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Emails the booking app sends customers, and the posts it makes to Slack for staff. Each is sent once, straight after the change it's about; changes here apply to messages not sent yet."
      />

      {(["email", "slack"] as const).map((channel) => (
        <Card key={channel} className="flex flex-col py-5">
          <div className="px-5 pb-3">
            <h2 className="text-base font-bold text-ink-strong">
              {channel === "email" ? "Emails to customers" : "Slack posts to staff"}
            </h2>
            <p className="text-sm text-subtle">
              {channel === "email"
                ? "Only booking confirmations are on to start with. Customers can turn off an email in their profile only once it's switched on here."
                : "Posts show the booking number, space, time and amount, never the customer's name or contact details."}
            </p>
          </div>
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {MESSAGES.filter((m) => m.channel === channel).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{m.label}</p>
                  <p className="text-sm text-subtle">{m.description}</p>
                </div>
                <MessageSwitch id={m.id} label={m.label} enabled={settings[m.id]} disabled={!canEdit} />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {failed.length > 0 && (
        <Card className="flex flex-col py-5">
          <div className="px-5 pb-3">
            <h2 className="text-base font-bold text-ink-strong">Problems sending</h2>
            <p className="text-sm text-subtle">
              Messages that couldn&apos;t be sent. They aren&apos;t tried again on their own; send one again or discard
              it. Failed messages are deleted after 30 days.
            </p>
          </div>
          <ul className="divide-y divide-line-soft border-t border-line-soft">
            {failed.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {label(f.message)}
                    {f.ref && (
                      <Link href={`/bookings/${f.ref}`} className="text-cobalt-600 hover:underline">
                        {f.ref}
                      </Link>
                    )}
                    {f.status === "failed" ? (
                      <Badge tone="error">Not sent</Badge>
                    ) : (
                      <Badge tone="pending">Will retry</Badge>
                    )}
                  </p>
                  <p className="truncate text-sm text-subtle" title={f.lastError ?? undefined}>
                    {formatDateTime(f.createdAt)} · {f.attempts} attempt{f.attempts === 1 ? "" : "s"} · {f.lastError}
                  </p>
                </div>
                <FailedActions id={f.id} canResend={f.status === "failed"} disabled={!canEdit} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
