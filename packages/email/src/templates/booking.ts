// Emails to customers about their bookings. Each takes the booking as it was when the email was queued and
// the links to use, and returns { subject, text, html }.
import type { Brand } from "./brand.ts";
import { button, details, heading, layout, paragraph, textBody } from "./layout.ts";

export interface BookingSummary {
  ref: string;
  space: string;
  service: string | null;
  /** ISO times */
  start: string;
  end: string;
  /** Whole units of the brand's currency */
  amount: number;
}

/** Date and time parts in the brand's time zone, put together by hand so every runtime writes them the same */
function parts(brand: Brand, iso: string) {
  const all = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: brand.timeZone,
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => all.find((p) => p.type === type)?.value ?? "";
  return {
    day: `${get("weekday")} ${get("day")} ${get("month")}`,
    year: get("year"),
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** "Tuesday 3 November 2026, 10:00–13:00" in the brand's time zone */
export function formatSlot(brand: Brand, booking: Pick<BookingSummary, "start" | "end">) {
  const start = parts(brand, booking.start);
  return `${start.day} ${start.year}, ${start.time}–${parts(brand, booking.end).time}`;
}

/** "Tuesday 3 November at 14:30" */
export function formatMoment(brand: Brand, iso: string) {
  const p = parts(brand, iso);
  return `${p.day} at ${p.time}`;
}

export const formatAmount = (brand: Brand, amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: brand.currency, maximumFractionDigits: 0 }).format(
    amount,
  );

const what = (b: BookingSummary) => (b.service ? `${b.service} · ${b.space}` : b.space);

/** The booking's details, for the HTML box and the plain-text version */
function summaryRows(brand: Brand, b: BookingSummary, withAmount = true): [string, string][] {
  return [
    ["Booking", b.ref],
    ["Space", what(b)],
    ["When", formatSlot(brand, b)],
    ...(withAmount && b.amount > 0 ? [["Amount", formatAmount(brand, b.amount)] as [string, string]] : []),
  ];
}

const rowsText = (rows: [string, string][]) => rows.map(([label, value]) => `${label}: ${value}`);

interface Base {
  brand: Brand;
  /** The customer's first name or full name */
  name: string;
  booking: BookingSummary;
}

const hello = (name: string) => `Hi ${name.split(" ")[0] || "there"},`;

/** Build an email from its parts, so the HTML and text versions always say the same */
function compose({
  brand,
  subject,
  preview,
  title,
  name,
  lines,
  rows,
  action,
  after = [],
}: {
  brand: Brand;
  subject: string;
  preview: string;
  title: string;
  name: string;
  lines: string[];
  rows: [string, string][];
  action?: { label: string; url: string };
  after?: string[];
}) {
  const html = layout({
    brand,
    subject,
    preview,
    body: [
      heading(title),
      paragraph(hello(name)),
      ...lines.map(paragraph),
      details(brand, rows),
      action ? button(brand, action.label, action.url) : "",
      ...after.map(paragraph),
    ].join("\n        "),
  });
  const text = textBody(brand, [
    hello(name),
    "",
    ...lines.flatMap((l) => [l, ""]),
    ...rowsText(rows),
    "",
    action && `${action.label}: ${action.url}`,
    action && "",
    ...after.flatMap((l) => [l, ""]),
  ]);
  return { subject, text: text.replace(/\n{3,}/g, "\n\n"), html };
}

/** Slot held: how much to pay, where, and by when */
export function bookingRequestedEmail(
  input: Base & {
    holdExpiresAt: string;
    payment: { bankName: string; accountName: string; accountNumber: string };
    payUrl: string;
  },
) {
  const { brand, booking, payment } = input;
  const by = formatMoment(brand, input.holdExpiresAt);
  return compose({
    brand,
    name: input.name,
    subject: `Pay to secure your booking ${booking.ref}`,
    preview: `We're holding your slot until ${by}. Pay ${formatAmount(brand, booking.amount)} and upload the receipt.`,
    title: "We're holding your slot",
    lines: [
      `Pay ${formatAmount(brand, booking.amount)} by bank transfer and upload your receipt by ${by}. If we don't get it by then, the slot is released.`,
    ],
    rows: [
      ...summaryRows(brand, booking),
      ["Bank", payment.bankName],
      ["Account name", payment.accountName],
      ["Account number", payment.accountNumber],
      ["Reference", booking.ref],
    ],
    action: { label: "Upload your receipt", url: input.payUrl },
    after: ["Use the booking number as the transfer reference, so we can match your payment."],
  });
}

export function receiptReceivedEmail(input: Base & { bookingUrl: string }) {
  const { brand, booking } = input;
  return compose({
    brand,
    name: input.name,
    subject: `We've got your receipt for ${booking.ref}`,
    preview: "We'll check it and confirm your booking shortly.",
    title: "Receipt received",
    lines: ["Thanks. We'll check your payment and confirm your booking shortly. Your slot stays reserved meanwhile."],
    rows: summaryRows(brand, booking),
    action: { label: "View your booking", url: input.bookingUrl },
  });
}

export function bookingConfirmedEmail(input: Base & { bookingUrl: string; calendarUrl: string; address: string }) {
  const { brand, booking } = input;
  return compose({
    brand,
    name: input.name,
    subject: `Booking confirmed: ${what(booking)}, ${formatSlot(brand, booking)}`,
    preview: `See you on ${formatSlot(brand, booking)}.`,
    title: "Your booking is confirmed",
    lines: ["Everything's set. Here are your booking details."],
    rows: [...summaryRows(brand, booking), ...(input.address ? [["Where", input.address] as [string, string]] : [])],
    action: { label: "View your booking", url: input.bookingUrl },
    after: [`Add it to your calendar: ${input.calendarUrl}`],
  });
}

export function bookingDeclinedEmail(input: Base & { reason: string; note: string | null; bookingUrl: string }) {
  const { brand, booking } = input;
  return compose({
    brand,
    name: input.name,
    subject: `We couldn't verify the payment for ${booking.ref}`,
    preview: input.reason,
    title: "We couldn't verify your payment",
    lines: [
      `Reason: ${input.reason}.`,
      ...(input.note ? [input.note] : []),
      "You can upload a new receipt from your booking while the slot is still free.",
    ],
    rows: summaryRows(brand, booking),
    action: { label: "Try again", url: input.bookingUrl },
  });
}

export function bookingCancelledEmail(input: Base & { bookUrl: string }) {
  const { brand, booking } = input;
  return compose({
    brand,
    name: input.name,
    subject: `Booking ${booking.ref} cancelled`,
    preview: `Your booking for ${formatSlot(brand, booking)} has been cancelled.`,
    title: "Booking cancelled",
    lines: ["Your booking has been cancelled and the slot released."],
    rows: summaryRows(brand, booking, false),
    action: { label: "Book another time", url: input.bookUrl },
  });
}

/** The hold ran out before a receipt arrived, or staff released it */
export function holdEndedEmail(input: Base & { released: boolean; bookUrl: string }) {
  const { brand, booking } = input;
  return compose({
    brand,
    name: input.name,
    subject: `Your hold on ${booking.ref} has ended`,
    preview: "The slot has been released.",
    title: "Your hold has ended",
    lines: [
      input.released
        ? "We've released the slot you were holding, so it's free for others to book."
        : "We didn't receive a payment receipt in time, so the slot has been released.",
      "If you still want it, you're welcome to book again.",
    ],
    rows: summaryRows(brand, booking, false),
    action: { label: "Book again", url: input.bookUrl },
  });
}
