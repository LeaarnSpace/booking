// Fixed copy for the landing and support pages. Space and service details come from the database.
import type { Faq } from "@learnspace/bookings/client";

export const HOW_TO_BOOK = [
  { title: "Sign Up", text: "Click the “Sign Up” button and follow the instructions." },
  { title: "Select Space", text: "Select between professional meeting rooms or specialized creative studios." },
  { title: "Select Slot", text: "Browse through the schedule and choose your desired slot from the ones available." },
  { title: "Service", text: "Select a specific service and add-ons where applicable." },
  {
    title: "Details",
    text: "Add the names of attendees, your contact details, the purpose of the booking, and the date and time.",
  },
  {
    title: "Pay",
    text: "Pay by bank transfer and upload your receipt. We confirm your booking once we've checked it.",
  },
];

export const GENERAL_FAQS: Faq[] = [
  {
    question: "Do I need to create an account before booking?",
    answer:
      "Yes. You can browse spaces as a guest, but you'll need an account to book, so we can send your confirmation and reminders.",
  },
  {
    question: "Can I cancel or reschedule my reserved booking?",
    answer:
      "You can cancel from My Bookings any time before the booking starts. To move a booking, cancel it and book the new time.",
  },
  {
    question: "Are add-ons included in the starting price?",
    answer:
      "No. The starting price is the hourly rate. Add-ons such as an extra camera or lights are charged per item for the booking.",
  },
  {
    question: "How do I pay?",
    answer:
      "Pay by bank transfer to the account shown when you book, then upload your receipt. Your slot is held while we check it.",
  },
];

export const SUPPORT_FAQS: Faq[] = [
  {
    question: "How do I book a specialized room?",
    answer: "Open Schedule, pick the space and service, choose a free slot, add your details and pay.",
  },
  {
    question: "What payment methods are supported?",
    answer: "Bank transfer. Upload your receipt after paying and we'll confirm your booking once we've checked it.",
  },
  {
    question: "Can I cancel a pending session?",
    answer:
      "Yes. Open the booking in My Bookings and choose Cancel. Pending and confirmed bookings can be cancelled before they start.",
  },
  {
    question: "What are the studio hours?",
    answer: "Each space shows its opening hours in the schedule. Times you can't book are greyed out.",
  },
];
