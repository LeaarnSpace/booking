// Sample catalogue for development and first setup, taken from the Figma designs. Staff change all of it
// in the back office; seeding only adds rows that don't exist yet, so it never overwrites their edits.
// FAQ answers and opening hours are placeholders until Learn Space confirms them.
import { db } from "./db.ts";
import { includedForServices, includedForSpaces, setServiceIncluded, setSpaceIncluded } from "./included.ts";
import { addOn, lengthDiscount, service, space } from "./schema.ts";
import type { DayHours, LengthDiscount } from "./types.ts";

const weekday: DayHours = { open: "08:00", close: "20:00" };
const saturday: DayHours = { open: "09:00", close: "18:00" };
const officeHours: DayHours = { open: "08:00", close: "18:00" };

const discounts: LengthDiscount[] = [
  { hours: 3, percent: 5 },
  { hours: 5, percent: 10 },
  { hours: 8, percent: 15 },
];

export const sampleDiscounts = discounts.map((d) => ({ ...d, spaceId: "creative-space" }));

export const sampleSpaces: (typeof space.$inferInsert)[] = [
  {
    id: "creative-space",
    name: "Creative Space",
    tagline:
      "A professional media workspace for diverse studio activities. Talk, pose, sing, express yourself comfortably here!",
    description:
      "A professional media workspace for diverse studio activities. Talk, pose, express yourself comfortably here.",
    capacity: 10,
    hourlyRate: 18_000,
    visibility: "everyone",
    hours: [weekday, weekday, weekday, weekday, weekday, saturday, null],
    closedOnPublicHolidays: true,
    faqs: [
      {
        question: "How do I pay for a Creative Space booking?",
        answer:
          "Pay by bank transfer to the account shown when you book, then upload your receipt. We confirm your booking once we've checked it.",
      },
      {
        question: "Can non-staff members book any of these services?",
        answer: "Yes. Every Creative Space service can be booked by anyone with a Learn Space account.",
      },
      {
        question: "Do add-ons vary by service?",
        answer: "No. Add-ons belong to the studio, so they're available with every service while stock lasts.",
      },
    ],
    sortOrder: 1,
  },
  {
    id: "meeting-room",
    name: "Meeting Room",
    tagline: "A quiet, focused room for team conversations, from quick standups to long strategy sessions.",
    description:
      "Professional spaces designed for high-impact meeting sessions, brainstorming and client close-ups. A quiet, focused room built for team conversations from quick standups to long strategy sessions.",
    capacity: 12,
    hourlyRate: 20_000,
    visibility: "staff",
    hours: [officeHours, officeHours, officeHours, officeHours, officeHours, null, null],
    closedOnPublicHolidays: true,
    faqs: [
      {
        question: "Can non-staff members book this room?",
        answer: "Not at the moment. The Meeting Room is for Learn Space staff.",
      },
      {
        question: "What's the cancellation policy?",
        answer: "You can cancel from My Bookings any time before the booking starts.",
      },
      { question: "What is the minimum duration to book?", answer: "One hour." },
    ],
    sortOrder: 2,
  },
];

export const sampleServices: (typeof service.$inferInsert)[] = [
  {
    id: "video-podcast",
    spaceId: "creative-space",
    name: "Video Podcast",
    description:
      "Mic booth, camera, mixer, and headphones built for interviews, episodes, and fun. A treated room designed to keep audio clean without needing your own gear.",
    hourlyRate: 18_000,
    faqs: [
      { question: "How many people can be in the room?", answer: "Up to 10, including your crew." },
      { question: "Do I need to bring my own headphones?", answer: "No. Headphones are provided for every guest." },
      {
        question: "Is a sound engineer included?",
        answer: "No, but our team sets the room up before you arrive and can show you around the equipment.",
      },
    ],
    sortOrder: 1,
  },
  {
    id: "videography",
    spaceId: "creative-space",
    name: "Videography",
    description: "2-camera setup with lighting for video podcast and productions.",
    hourlyRate: 25_000,
    sortOrder: 2,
  },
  {
    id: "photography",
    spaceId: "creative-space",
    name: "Photography",
    description: "Lighting rig, backdrops, and props for a full photo session.",
    hourlyRate: 20_000,
    sortOrder: 3,
  },
  {
    id: "audio-podcast",
    spaceId: "creative-space",
    name: "Audio Podcast",
    description: "Mic booth, mixer, and headphones built for interviews, episodes, and fun.",
    hourlyRate: 22_000,
    sortOrder: 4,
  },
];

export const sampleAddOns: (typeof addOn.$inferInsert)[] = [
  {
    id: "extra-camera",
    spaceId: "creative-space",
    name: "Extra camera",
    description: "Second angle, ready to go",
    price: 5_500,
    stock: 3,
    sortOrder: 1,
  },
  {
    id: "hd-lights",
    spaceId: "creative-space",
    name: "2x HD Light",
    description: "Brighter, even lighting",
    price: 7_500,
    stock: 3,
    sortOrder: 2,
  },
  {
    id: "teleprompter",
    spaceId: "creative-space",
    name: "Teleprompter",
    description: "For scripted segments",
    price: 7_500,
    stock: 3,
    sortOrder: 3,
  },
];

/** "What's included" for the sample spaces and services */
export const sampleIncluded: { spaces: Record<string, string[]>; services: Record<string, string[]> } = {
  spaces: { "meeting-room": ["Whiteboard & markers", "TV Screen", "Unlimited internet access"] },
  services: {
    "video-podcast": ["Boom Arm", "Portable Recorder", "Acoustic Panel Setup", "Headphones (per set)", "Pop Filter"],
    videography: ["Two cameras with tripods", "Continuous lighting kit", "Green screen backdrop", "Field monitor"],
    photography: ["Strobe lighting rig", "Paper backdrops", "Props", "Changing area"],
    "audio-podcast": ["Four studio microphones", "Mixer", "Headphones (per set)", "Acoustic treatment"],
  },
};

/** Adds the sample catalogue, leaving anything that already exists alone */
export async function seedCatalogue() {
  await db.insert(space).values(sampleSpaces).onConflictDoNothing();
  await db.insert(service).values(sampleServices).onConflictDoNothing();
  await db.insert(addOn).values(sampleAddOns).onConflictDoNothing();
  await db.insert(lengthDiscount).values(sampleDiscounts).onConflictDoNothing();
  // Only for spaces and services that were just added (no list yet)
  const [spaceItems, serviceItems] = await Promise.all([
    includedForSpaces(Object.keys(sampleIncluded.spaces)),
    includedForServices(Object.keys(sampleIncluded.services)),
  ]);
  await db.transaction(async (tx) => {
    for (const [id, names] of Object.entries(sampleIncluded.spaces)) {
      if (!spaceItems.get(id)?.length) await setSpaceIncluded(tx, id, names);
    }
    for (const [id, names] of Object.entries(sampleIncluded.services)) {
      if (!serviceItems.get(id)?.length) await setServiceIncluded(tx, id, names);
    }
  });
}
