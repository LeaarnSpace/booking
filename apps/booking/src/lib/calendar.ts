// "Add to Calendar": links that open Google Calendar or Outlook with the booking filled in (the customer clicks
// Save), and the .ics file for Apple Calendar and everything else (bookings/[ref]/calendar). No sign-in to
// Google or Microsoft is needed on our side.
import { env } from "./env";

export interface CalendarBooking {
  ref: string;
  space: string;
  service: string | null;
  start: Date | string;
  end: Date | string;
}

/** 20261103T090000Z */
export const calendarStamp = (d: Date | string) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function calendarEvent(b: CalendarBooking) {
  return {
    title: `${b.service ?? b.space} at Learn Space`,
    location: env.support.address ? `${b.space}, ${env.support.address}` : b.space,
    details: `Booking ref ${b.ref}\n${new URL(`/bookings/${b.ref}`, env.appUrl)}`,
  };
}

export function googleCalendarUrl(b: CalendarBooking) {
  const e = calendarEvent(b);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${calendarStamp(b.start)}/${calendarStamp(b.end)}`,
    details: e.details,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Outlook.com and Microsoft 365 work accounts use different addresses */
export function outlookCalendarUrl(b: CalendarBooking, kind: "personal" | "work" = "personal") {
  const e = calendarEvent(b);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(b.start).toISOString(),
    enddt: new Date(b.end).toISOString(),
    body: e.details,
    location: e.location,
  });
  const host = kind === "work" ? "outlook.office.com" : "outlook.live.com";
  return `https://${host}/calendar/0/action/compose?${params}`;
}
