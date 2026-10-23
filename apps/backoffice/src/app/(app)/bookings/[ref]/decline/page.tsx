import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatSlot, naira } from "@/lib/bookings/format";
import { getBooking } from "@/lib/bookings/store";
import { requireSection } from "@/lib/viewer";
import { declineBooking } from "../../actions";
import { DeclineForm } from "./decline-form";

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Decline ${(await params).ref}` };
}

export default async function DeclinePage({ params }: Props) {
  await requireSection("bookings", "editor");
  const { ref } = await params;
  const booking = await getBooking(ref);
  if (!booking) notFound();
  if (booking.status !== "pending") redirect(`/bookings/${ref}`);
  const firstName = booking.customer.name.split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link
        href={`/bookings/${ref}`}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft size={16} /> Booking {ref}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">Decline booking {ref}</h1>
        <p className="mt-1 text-sm text-subtle">
          {booking.customer.name} · {booking.room.name} · {formatSlot(booking.start, booking.end)} ·{" "}
          {naira(booking.amount)}
        </p>
      </div>
      <DeclineForm action={declineBooking.bind(null, ref)} firstName={firstName} />
    </div>
  );
}
