// "Add to Calendar" for Apple Calendar and other apps: the booking as an .ics file, which phones and calendar apps
// open directly. Google Calendar and Outlook get links instead (see lib/calendar.ts).
import { getCustomerBooking } from "@learnspace/bookings";
import { calendarEvent, calendarStamp as stamp } from "@/lib/calendar";
import { getViewer } from "@/lib/viewer";

const text = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export async function GET(_: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const viewer = await getViewer();
  const b = viewer ? await getCustomerBooking(viewer.id, ref) : null;
  if (!b || b.status !== "confirmed") return new Response("Not found", { status: 404 });
  const e = calendarEvent({ ref: b.ref, space: b.spaceName, service: b.serviceName, start: b.start, end: b.end });
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Learn Space//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:${b.ref}@learnspace.com.ng`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(b.start)}`,
    `DTEND:${stamp(b.end)}`,
    `SUMMARY:${text(e.title)}`,
    `LOCATION:${text(e.location)}`,
    `DESCRIPTION:${text(e.details)}`,
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
