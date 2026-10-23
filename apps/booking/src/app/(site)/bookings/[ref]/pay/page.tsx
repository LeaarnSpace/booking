import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCustomerBooking } from "@learnspace/bookings";
import { ReceiptUpload } from "@/components/booking/receipt-upload";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { env } from "@/lib/env";
import { formatDateTime, naira } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Payment" };

export default async function PayPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const viewer = await requireViewer(`/bookings/${ref}/pay`);
  const booking = await getCustomerBooking(viewer.id, ref);
  if (!booking) notFound();
  if (booking.status !== "hold") redirect(`/bookings/${ref}`);
  const { accountNumber, accountName, bankName } = env.payment;

  return (
    <>
      <SiteHeader />
      <main className="pb-56 md:pb-16">
        <PageTitle title="Payment" back="/bookings?tab=pending" />
        <Container className="pt-6">
          <div className="mx-auto flex max-w-[760px] flex-col gap-8">
            <section className="flex flex-col gap-6 rounded-lg border border-line bg-sunk px-8 py-8">
              <h2 className="text-xl font-medium text-ink-strong">Pay to Account</h2>
              <dl className="flex flex-col gap-4 text-sm">
                <div className="flex items-center justify-between border-b border-line pb-5">
                  <dt className="text-subtle">Total Amount</dt>
                  <dd className="text-xl font-bold text-[#2f3cdb]">{naira(booking.price.total)}</dd>
                </div>
                {accountNumber ? (
                  <>
                    <Row label="Account Number" value={accountNumber} />
                    <Row label="Account Name" value={accountName} />
                    <Row label="Bank Name" value={bankName} />
                  </>
                ) : (
                  <p className="text-muted">Payment details aren’t set up yet. Please contact support to pay.</p>
                )}
                <Row label="Reference" value={booking.ref} />
              </dl>
              <p className="text-sm text-muted">
                Use <b>{booking.ref}</b> as the transfer reference. We’re holding your slot until{" "}
                <b>{booking.holdExpiresAt ? formatDateTime(booking.holdExpiresAt) : "soon"}</b>.
              </p>
            </section>
            <ReceiptUpload bookingRef={booking.ref} total={booking.price.total} />
          </div>
        </Container>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-base font-bold tracking-[0.04em] text-ink-strong">{value}</dd>
    </div>
  );
}
