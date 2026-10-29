// "Add to Calendar" menu: Google Calendar and Outlook open in a new tab with the booking filled in; Apple and
// other calendars download the .ics file. A <details> element, so it works without JavaScript.
import { googleCalendarUrl, outlookCalendarUrl, type CalendarBooking } from "@/lib/calendar";

export function AddToCalendar({ booking }: { booking: CalendarBooking }) {
  const options = [
    { label: "Google Calendar", href: googleCalendarUrl(booking), external: true },
    { label: "Outlook.com", href: outlookCalendarUrl(booking), external: true },
    { label: "Outlook (work or school)", href: outlookCalendarUrl(booking, "work"), external: true },
    { label: "Apple Calendar or other (.ics)", href: `/bookings/${booking.ref}/calendar`, external: false },
  ];
  return (
    <details className="group relative flex-1">
      <summary className="flex h-11 list-none items-center justify-center gap-2 rounded-md border border-line bg-white text-base text-ink hover:bg-sunk [&::-webkit-details-marker]:hidden">
        Add to Calendar{" "}
        <span aria-hidden className="text-xl transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <ul className="absolute inset-x-0 top-full z-10 mt-2 flex flex-col overflow-hidden rounded-md border border-line bg-white py-1 shadow-pop">
        {options.map((o) => (
          <li key={o.label}>
            <a
              href={o.href}
              {...(o.external && { target: "_blank", rel: "noopener noreferrer" })}
              className="block px-4 py-3 text-base text-ink hover:bg-sunk"
            >
              {o.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
