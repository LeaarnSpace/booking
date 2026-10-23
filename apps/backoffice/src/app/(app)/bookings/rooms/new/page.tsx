import type { Metadata } from "next";
import { admin } from "@learnspace/bookings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSection } from "@/lib/viewer";
import { saveRoom } from "../actions";
import { RoomForm } from "../room-form";

export const metadata: Metadata = { title: "Add room" };

const BLANK = {
  name: "",
  tagline: "",
  description: "",
  capacity: 8,
  hourlyRate: 5_000,
  visibility: "staff" as const,
  hours: [...Array.from({ length: 5 }, () => ({ open: "09:00", close: "17:00" })), null, null],
  closedDates: [],
  closedOnPublicHolidays: true,
  included: ["Wi-Fi", "Air conditioning"],
  faqs: [],
};

export default async function NewRoomPage() {
  await requireSection("bookings", "editor");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/bookings/rooms"
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft size={16} /> Rooms
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">Add a room</h1>
        <p className="mt-1 text-sm text-subtle">
          New rooms start as staff only, so you can add photos and check everything before guests see it.
        </p>
      </div>
      <RoomForm
        room={BLANK}
        suggestions={await admin.listIncludedItems()}
        action={saveRoom.bind(null, null)}
        submitLabel="Create room"
        isNew
      />
    </div>
  );
}
