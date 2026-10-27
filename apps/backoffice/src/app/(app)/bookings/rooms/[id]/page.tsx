import type { Metadata } from "next";
import { admin } from "@learnspace/bookings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getRoom, MAX_ROOM_PHOTOS } from "@/lib/bookings/store";
import { mediaStorage, viewUrl } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { saveRoom } from "../actions";
import { PhotoManager } from "../photo-manager";
import { RoomForm } from "../room-form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const room = await getRoom((await params).id);
  return { title: room ? `Edit ${room.name}` : "Room" };
}

const DONE: Record<string, string> = {
  created: "Room created. It's staff only until you switch it to everyone.",
  saved: "Changes saved.",
};

export default async function EditRoomPage({ params, searchParams }: Props) {
  await requireSection("bookings", "editor");
  const [{ id }, { done }] = await Promise.all([params, searchParams]);
  const [room, services, suggestions] = await Promise.all([
    getRoom(id),
    admin.listServicesFor(id),
    admin.listIncludedItems(),
  ]);
  if (!room) notFound();
  const storage = await mediaStorage();
  const photos = await Promise.all(
    room.photos.map(async (p) => ({ key: p.key, alt: p.alt, url: await viewUrl(storage, p.key) })),
  );
  const details = {
    tagline: room.tagline,
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    hourlyRate: room.hourlyRate,
    visibility: room.visibility,
    hours: room.hours,
    closedDates: room.closedDates,
    closedOnPublicHolidays: room.closedOnPublicHolidays,
    included: room.included,
    faqs: room.faqs,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href="/bookings/rooms"
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft size={16} /> Rooms
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-ink-strong">{room.name}</h1>

      {done && DONE[done] && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-cobalt-50 px-4 py-3 text-sm text-cobalt-700">
          <CheckCircle2 size={18} aria-hidden="true" /> {DONE[done]}
        </p>
      )}

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-base font-bold text-ink-strong">Photos</h2>
        <PhotoManager
          owner={{ kind: "room", id: room.id }}
          roomName={room.name}
          photos={photos}
          max={MAX_ROOM_PHOTOS}
          canEdit
        />
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-ink-strong">Services</h2>
          <p className="text-sm text-subtle">
            What customers book this room for, each with its own page. Rates are on the{" "}
            <Link href="/bookings/pricing" className="font-semibold text-cobalt-600 hover:underline">
              Pricing
            </Link>{" "}
            page, where you can also add a service.
          </p>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-subtle">No services: customers book the whole room at its hourly rate.</p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-md border border-line-soft">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/bookings/rooms/${room.id}/services/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-sunk"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">{s.name}</span>
                    <span className="text-xs text-subtle">
                      {s.photos.length} photo{s.photos.length === 1 ? "" : "s"} · {s.included.length} included ·{" "}
                      {s.faqs.length} question{s.faqs.length === 1 ? "" : "s"}
                      {!s.active && " · not on sale"}
                    </span>
                  </span>
                  <Pencil size={15} className="text-subtle" aria-hidden="true" />
                  <span className="sr-only">Edit</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RoomForm
        key={JSON.stringify(details)}
        room={details}
        suggestions={suggestions}
        action={saveRoom.bind(null, room.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
