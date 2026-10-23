import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCustomerBooking } from "@learnspace/bookings";
import { CANCEL_REASONS } from "@learnspace/bookings/client";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { requireViewer } from "@/lib/viewer";
import { cancel } from "../../actions";
import { CancelForm } from "./cancel-form";

export const metadata: Metadata = { title: "Cancel Booking" };

export default async function CancelPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const viewer = await requireViewer(`/bookings/${ref}/cancel`);
  const b = await getCustomerBooking(viewer.id, ref);
  if (!b) notFound();
  if (!["hold", "pending", "confirmed"].includes(b.status) || b.start <= new Date()) redirect(`/bookings/${ref}`);

  return (
    <>
      <SiteHeader />
      <main className="pb-48 md:pb-16">
        <PageTitle title="Cancel Booking" back={`/bookings/${ref}`} />
        <Container className="pt-6">
          <CancelForm action={cancel.bind(null, ref)} reasons={[...CANCEL_REASONS]} />
        </Container>
      </main>
    </>
  );
}
