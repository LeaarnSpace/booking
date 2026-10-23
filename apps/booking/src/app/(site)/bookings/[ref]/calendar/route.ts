// "Add to Calendar": the booking as an .ics file, which phones and calendar apps open directly.
import { getCustomerBooking } from "@learnspace/bookings";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export async function GET(_: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const viewer = await getViewer();
  const b = viewer ? await getCustomerBooking(viewer.id, ref) : null;
  if (!b || b.status !== "confirmed") return new Response("Not found", { status: 404 });
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Learn Space//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${b.ref}@learnspace.com.ng`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(b.start)}`,
    `DTEND:${stamp(b.end)}`,
    `SUMMARY:${text(`${b.serviceName ?? b.spaceName} at Learn Space`)}`,
    `LOCATION:${text(`${b.spaceName}, ${env.support.address}`)}`,
    `DESCRIPTION:${text(`Booking ref ${b.ref}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${b.ref}.ics"`,
    },
  });
}
