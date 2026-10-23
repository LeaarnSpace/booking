import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerBooking, type CustomerBooking } from "@learnspace/bookings";
import { DECLINE_REASONS } from "@learnspace/bookings/client";
import { StatusBadge } from "@/components/booking/status";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { StatusMark } from "@/components/ui/status-mark";
import { formatShortDay, formatTimeRange, hoursLabel, naira } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Booking" };

type Props = { params: Promise<{ ref: string }>; searchParams: Promise<{ done?: string }> };

export default async function BookingPage({ params, searchParams }: Props) {
  const { ref } = await params;
  const { done } = await searchParams;
  const viewer = await requireViewer(`/bookings/${ref}`);
  const b = await getCustomerBooking(viewer.id, ref);
  if (!b) notFound();
  if (b.status === "hold") redirect(`/bookings/${ref}/pay`);
  const active = (b.status === "pending" || b.status === "confirmed") && b.start > new Date();

  return (
    <>
      <SiteHeader />
      <main className="pb-16">
        <PageTitle title={b.serviceName ?? b.spaceName} back="/bookings">
          <StatusBadge status={b.status} />
        </PageTitle>
        <Container className="pt-6">
          <div className="mx-auto flex max-w-[760px] flex-col gap-8">
            <Outcome booking={b} done={done} />
            {b.status === "declined" ? (
              <div className="flex gap-4">
                <ButtonLink href="/schedule" variant="secondary-primary" className="flex-1">
                  Back to schedule
                </ButtonLink>
                {b.start > new Date() && <RetryButton bookingRef={b.ref} />}
              </div>
            ) : (
              <Summary booking={b} firstName={viewer.name.split(" ")[0] ?? ""} />
            )}
            {b.status !== "declined" && (
              <div className="flex flex-wrap gap-4">
                {b.status === "confirmed" && (
                  <a
                    href={`/bookings/${b.ref}/calendar`}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white text-base text-ink hover:bg-sunk"
                  >
                    Add to Calendar{" "}
                    <span aria-hidden className="text-xl">
                      +
                    </span>
                  </a>
                )}
                <ButtonLink href="/schedule" className="flex-1">
                  Back to schedule
                </ButtonLink>
              </div>
            )}
            {active && (
              <Link
                href={`/bookings/${b.ref}/cancel`}
                className="self-center text-sm font-medium text-error-ink hover:underline"
              >
                Cancel this booking
              </Link>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}

function Outcome({ booking: b, done }: { booking: CustomerBooking; done?: string }) {
  const heading = (tone: "success" | "pending" | "error", title: string, text?: string) => (
    <div className="flex flex-col items-center gap-2 text-center">
      <StatusMark tone={tone} />
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {text && <p className="text-base text-subtle">{text}</p>}
      <p className="text-base text-subtle">
        View{" "}
        <Link href="/bookings" className="text-[#2f3cdb] hover:underline">
          My Bookings
        </Link>
      </p>
    </div>
  );
  switch (b.status) {
    case "confirmed":
      return done === "confirmed" || done === "approved"
        ? heading("success", "All Set!!", "Your slot has been secured!")
        : null;
    case "pending":
      return (
        <>
          {heading(
            "pending",
            "Payment Pending",
            "We’ve got your receipt and will confirm your booking once we’ve checked it.",
          )}
          {b.receipt && (
            <div className="flex items-center gap-4">
              <span className="text-base font-medium text-ink-strong">Receipt:</span>
              <div className="flex flex-1 items-center gap-3 rounded-md bg-sunk px-6 py-3">
                <svg aria-hidden viewBox="0 0 24 24" className="size-6 fill-placeholder">
                  <path
                    d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V9h5.5M8 13h8M8 17h5"
                    stroke="white"
                    strokeWidth={1.4}
                  />
                </svg>
                <span>
                  <b className="block text-base font-medium text-ink-strong">{b.receipt.fileName}</b>
                  <span className="text-sm text-subtle">{Math.max(1, Math.round(b.receipt.size / 1024))}kb</span>
                </span>
              </div>
            </div>
          )}
        </>
      );
    case "declined": {
      const reason = DECLINE_REASONS.find((r) => r.id === b.declineReason)?.label;
      return (
        <>
          {heading("error", "Payment Unsuccessful")}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-ink-strong">Reason</h2>
            <p className="min-h-[170px] rounded-md border border-line bg-sunk p-4 text-base text-subtle">
              {b.declineNote || reason || "The attached receipt couldn’t be verified."}
            </p>
            {b.start > new Date() && (
              <p className="text-sm text-muted">
                If the slot is still free, Retry holds it again so you can upload a new receipt.
              </p>
            )}
          </section>
        </>
      );
    }
    case "cancelled":
      return done === "cancelled" ? heading("error", "Booking cancelled", "Your slot has been released.") : null;
    case "expired":
      return heading("error", "This hold ran out", "The receipt didn’t arrive in time, so the slot was released.");
    default:
      return null;
  }
}

/** The booking card from the design: logo, greeting, the slot and what it costs */
function Summary({ booking: b, firstName }: { booking: CustomerBooking; firstName: string }) {
  const free = b.kind === "staff";
  return (
    <article className="flex flex-col gap-6 rounded-md border border-blue-700/40 bg-sunk px-6 py-7">
      <div className="border-b border-ink-strong pb-6">
        <Logo className="size-[100px] md:size-[100px]" />
      </div>
      <p className="text-base text-ink-strong">
        Hi, {firstName}. Thank you for choosing Learn Space!
        {b.status === "confirmed"
          ? " We’re excited to have you. Here are your booking details below."
          : " Here are your booking details."}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-sm border border-blue-700/40 p-3 md:grid-cols-4">
        <Fact label="Date" value={formatShortDay(b.start)} />
        <Fact label="Time" value={formatTimeRange(b.start, b.end)} />
        <Fact label="Booked by" value={b.contactName} />
        <Fact label="Location" value={b.spaceName} />
      </dl>
      <section className="flex flex-col gap-2 border-b border-line pb-3">
        <h3 className="text-base font-medium text-subtle">Service</h3>
        <Line
          label={`${b.serviceName ?? b.spaceName} (${hoursLabel(b.price.hours)})`}
          value={free ? "Free" : naira(b.price.base)}
        />
        {b.price.discount > 0 && (
          <Line label={`${b.price.discountPercent}% off`} value={`−${naira(b.price.discount)}`} />
        )}
      </section>
      {b.price.addOns.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-base font-medium text-subtle">Add-Ons</h3>
          {b.price.addOns.map((a) => (
            <Line key={a.addOnId} label={`${a.name} (${a.quantity})`} value={free ? "Free" : naira(a.total)} />
          ))}
        </section>
      )}
      <p className="flex items-center gap-3 bg-[#dae2f2] px-3 py-3 text-lg font-bold text-ink-strong">
        Total
        <span className="h-px flex-1 border-t border-dashed border-muted" />
        {free ? "Free" : naira(b.price.total)}
      </p>
      <p className="text-sm font-medium uppercase tracking-[0.04em] text-muted">
        Booking ref: <b className="text-base text-ink-strong">{b.ref}</b>
      </p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-base font-medium text-subtle">{label}</dt>
      <dd className="text-lg font-bold tracking-[0.014em] text-ink-strong">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center gap-3 text-base font-medium text-ink-strong">
      <span className="shrink-0">{label}</span>
      <span className="h-px flex-1 border-t border-dashed border-muted" />
      <span className="shrink-0">{value}</span>
    </p>
  );
}
