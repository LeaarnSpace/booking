import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, FileImage, Paperclip } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { Countdown } from "@/components/bookings/countdown";
import { StatusBadge } from "@/components/bookings/status-badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration, formatSlot, naira } from "@/lib/bookings/format";
import { getBooking } from "@/lib/bookings/store";
import { DECLINE_REASONS, type BookingView } from "@/lib/bookings/types";
import { env } from "@/lib/env";
import { can } from "@/lib/sections";
import { receiptStorage } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { approveBooking, extendHold, releaseHold, sendMessage } from "../actions";

type Props = { params: Promise<{ ref: string }>; searchParams: Promise<{ done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Booking ${(await params).ref}` };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const viewer = await requireSection("bookings");
  const [{ ref }, { done }] = await Promise.all([params, searchParams]);
  const booking = await getBooking(ref);
  if (!booking) notFound();
  const canAct = can(viewer.access, "bookings", "editor");
  const firstName = booking.customer.name.split(" ")[0];
  const expiring = booking.holdExpiring;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-subtle hover:text-ink"
        >
          <ArrowLeft size={16} /> Bookings
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-strong">Booking {booking.ref}</h1>
          <StatusBadge status={booking.status} expiring={expiring} />
        </div>
      </div>

      {done && <DoneNotice outcome={done} firstName={firstName} />}
      <StatusPanel booking={booking} expiring={expiring} />

      <div className={cn("grid gap-6", booking.kind === "user" && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="flex flex-col gap-6">
          <Details booking={booking} />

          {booking.kind === "user" && <Receipt booking={booking} />}

          {canAct && booking.status === "pending" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionForm action={approveBooking.bind(null, booking.ref)} className="flex flex-col gap-2">
                <SubmitButton size="lg" className="w-full" pendingLabel="Approving…">
                  Approve and confirm
                </SubmitButton>
              </ActionForm>
              <Link
                href={`/bookings/${booking.ref}/decline`}
                className={buttonStyles({ variant: "danger-outline", size: "lg", className: "w-full" })}
              >
                Decline
              </Link>
            </div>
          )}

          {canAct && booking.status === "hold" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-3">
                <ActionForm action={extendHold.bind(null, booking.ref)} className="flex flex-col gap-2">
                  <SubmitButton pendingLabel="Extending…">
                    Extend hold by {formatDuration(env.booking.holdExtendMinutes * 60_000)}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={releaseHold.bind(null, booking.ref)} className="flex flex-col gap-2">
                  <SubmitButton
                    variant="danger-outline"
                    pendingLabel="Releasing…"
                    confirmMessage={`Release this slot now? ${firstName} will lose the hold.`}
                  >
                    Release slot now
                  </SubmitButton>
                </ActionForm>
              </div>
              <p className="text-xs text-subtle">
                Releasing reopens the slot for other guests straight away and tells {firstName} the hold has ended.
              </p>
            </div>
          )}

          {!canAct && (booking.status === "pending" || booking.status === "hold") && (
            <p className="text-sm text-subtle">
              You can view bookings. Ask a team manager for Editor access to approve, decline or change holds.
            </p>
          )}
        </div>

        {booking.kind === "user" && <Thread booking={booking} canReply={canAct} firstName={firstName} />}
      </div>
    </div>
  );
}

const DONE: Record<string, (name: string) => string> = {
  approved: (name) => `Booking approved. ${name} sees it confirmed in the booking app.`,
  declined: (name) => `Booking declined. ${name} sees your reason in the booking app and can upload a new receipt.`,
  extended: () => "Hold extended.",
  released: (name) => `Slot released. ${name} gets a notification that the hold has ended.`,
};

function DoneNotice({ outcome, firstName }: { outcome: string; firstName: string }) {
  const message = DONE[outcome]?.(firstName);
  if (!message) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-md bg-cobalt-50 px-4 py-3 text-sm text-cobalt-700">
      <CheckCircle2 size={18} aria-hidden="true" /> {message}
    </p>
  );
}

function StatusPanel({ booking, expiring }: { booking: BookingView; expiring: boolean }) {
  const { status, decision } = booking;
  const reason = DECLINE_REASONS.find((r) => r.id === decision?.reason)?.label;

  if (status === "hold") {
    return (
      <Panel tone={expiring ? "error" : "pending"}>
        <p className="text-lg font-bold">
          Hold ends in <Countdown until={booking.holdExpiresAt!.toISOString()} />
        </p>
        <p className="mt-1 text-sm">
          Waiting for {booking.customer.name.split(" ")[0]} to upload a payment receipt. If none arrives, the slot is
          released automatically at {formatDateTime(booking.holdExpiresAt!)}.
        </p>
      </Panel>
    );
  }
  if (booking.kind === "staff") {
    return (
      <Panel tone="confirmed">
        <p className="font-bold">Confirmed automatically. No action needed.</p>
        <p className="mt-1 text-sm">
          Staff bookings are free and never enter the payment review queue. Staff are recognised by their email domain.
        </p>
      </Panel>
    );
  }
  if (status === "confirmed" && decision) {
    return (
      <Panel tone="confirmed">
        <p className="font-bold">Approved by {decision.by}</p>
        <p className="mt-1 text-sm">{formatDateTime(decision.at)}. The slot is reserved.</p>
      </Panel>
    );
  }
  if (status === "declined" && decision) {
    return (
      <Panel tone="error">
        <p className="font-bold">
          Declined by {decision.by}: {reason}
        </p>
        {decision.note && <p className="mt-1 text-sm">&ldquo;{decision.note}&rdquo;</p>}
        <p className="mt-1 text-sm">{formatDateTime(decision.at)}</p>
      </Panel>
    );
  }
  if (status === "expired" && decision) {
    return (
      <Panel tone="neutral">
        <p className="font-bold">Hold ended, slot released</p>
        <p className="mt-1 text-sm">
          {decision.by === "Hold ran out" ? "No receipt arrived in time" : `Released by ${decision.by}`},{" "}
          {formatDateTime(decision.at)}.
        </p>
      </Panel>
    );
  }
  if (status === "cancelled") {
    return (
      <Panel tone="neutral">
        <p className="font-bold">Cancelled by the customer</p>
      </Panel>
    );
  }
  return null;
}

function Panel({ tone, children }: { tone: "pending" | "confirmed" | "error" | "neutral"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-5 py-4",
        tone === "pending" && "border-pending bg-pending-50 text-pending-ink",
        tone === "confirmed" && "border-confirmed bg-confirmed-50 text-confirmed-ink",
        tone === "error" && "border-error bg-error-50 text-error-ink",
        tone === "neutral" && "border-line bg-sunk text-muted",
      )}
    >
      {children}
    </div>
  );
}

function Details({ booking }: { booking: BookingView }) {
  const staff = booking.kind === "staff";
  const rows: [string, React.ReactNode][] = [
    [
      staff ? "Staff member" : "Guest",
      <>
        {booking.customer.name}{" "}
        <a href={`mailto:${booking.customer.email}`} className="block text-cobalt-600 sm:inline">
          {booking.customer.email}
        </a>
      </>,
    ],
    ["Room", booking.serviceName ? `${booking.room.name} · ${booking.serviceName}` : booking.room.name],
    ["Date & time", formatSlot(booking.start, booking.end)],
    ["Booking type", staff ? "Staff, free" : "Guest, paid"],
    ["Amount", naira(booking.amount)],
    ["Requested", formatDateTime(booking.createdAt)],
  ];
  if (booking.status === "hold") rows.push(["Hold ends", formatDateTime(booking.holdExpiresAt!)]);

  return (
    <Card>
      <dl className="divide-y divide-line-soft">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:justify-between sm:gap-6">
            <dt className="text-subtle">{label}</dt>
            <dd className="text-ink sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** The uploaded receipt, through short-lived private links (the receipts bucket is never public) */
async function Receipt({ booking }: { booking: BookingView }) {
  const receipt = booking.receipt;
  const storage = await receiptStorage();
  const found = receipt ? await storage.head(receipt.key) : null;
  const [viewLink, downloadLink] =
    receipt && found
      ? await Promise.all([
          storage.createDownloadUrl(receipt.key, { expiresIn: 600 }),
          storage.createDownloadUrl(receipt.key, { expiresIn: 600, downloadName: receipt.fileName }),
        ])
      : [null, null];
  const type = found?.contentType ?? receipt?.contentType;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-bold text-ink-strong">Payment receipt</h2>
        {receipt && downloadLink && (
          <span className="flex items-center gap-3 text-sm">
            <a href={viewLink!} target="_blank" rel="noreferrer" className="font-semibold text-cobalt-600">
              Open full size
            </a>
            <a href={downloadLink} className="inline-flex items-center gap-1 font-semibold text-cobalt-600">
              <Download size={14} aria-hidden="true" /> Download
            </a>
          </span>
        )}
      </div>

      {!receipt ? (
        <p className="rounded-lg border border-dashed border-line bg-white px-5 py-6 text-sm text-subtle">
          No receipt uploaded yet.
        </p>
      ) : !found ? (
        <p className="rounded-lg border border-dashed border-error bg-error-50 px-5 py-6 text-sm text-error-ink">
          {receipt.fileName} is missing from storage. It may have been deleted after the retention period.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line-soft bg-white">
          {type === "application/pdf" ? (
            <iframe src={viewLink!} title={`Receipt ${receipt.fileName}`} className="h-[480px] w-full bg-sunk" />
          ) : type === "image/jpeg" || type === "image/png" ? (
            <a href={viewLink!} target="_blank" rel="noreferrer" className="block bg-sunk">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived link to private storage */}
              <img
                src={viewLink!}
                alt={`Receipt ${receipt.fileName}`}
                className="mx-auto max-h-[480px] object-contain"
              />
            </a>
          ) : (
            <p className="flex items-center gap-2 px-5 py-6 text-sm text-subtle">
              <FileImage size={20} aria-hidden="true" /> This file type can&apos;t be previewed here. Download it to
              view.
            </p>
          )}
          <p className="border-t border-line-soft px-4 py-2 text-xs text-subtle">
            {receipt.fileName} · {formatBytes(found.size)} · uploaded {formatDateTime(receipt.uploadedAt)}
          </p>
        </div>
      )}
    </section>
  );
}

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function Thread({ booking, canReply, firstName }: { booking: BookingView; canReply: boolean; firstName: string }) {
  return (
    <Card className="flex h-fit flex-col gap-4 p-5">
      <div>
        <h2 className="text-base font-bold text-ink-strong">Messages</h2>
        <p className="text-xs text-subtle">
          {firstName} gets these as notifications in the booking app. New receipts appear here.
        </p>
      </div>

      {booking.messages.length === 0 ? (
        <p className="text-sm text-subtle">No messages yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {booking.messages.map((m) => (
            <li
              key={m.id}
              className={cn("rounded-md px-3 py-2.5 text-sm", m.from === "staff" ? "bg-cobalt-50" : "bg-sunk")}
            >
              <p className="flex justify-between gap-2 text-xs text-subtle">
                <span>{m.from === "staff" ? `${m.author} (Learn Space)` : m.author}</span>
                <span>{formatDateTime(m.at)}</span>
              </p>
              {m.attachment ? (
                <p className="mt-0.5 flex items-center gap-1.5 font-medium text-cobalt-600">
                  <Paperclip size={14} aria-hidden="true" /> {m.attachment}
                </p>
              ) : (
                <p className="mt-0.5 text-ink">{m.body}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      {canReply && booking.status !== "expired" && (
        <ActionForm action={sendMessage.bind(null, booking.ref)} resetOnSuccess className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="reply">
            Reply to {firstName}
          </label>
          <textarea
            id="reply"
            name="body"
            rows={3}
            required
            maxLength={2000}
            placeholder={`Write to ${firstName}…`}
            className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle"
          />
          <SubmitButton variant="secondary" size="sm" className="self-end" pendingLabel="Sending…">
            Send
          </SubmitButton>
        </ActionForm>
      )}
    </Card>
  );
}
