/* eslint-disable @next/next/no-img-element -- photos come from object storage, which may be another host */
import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatWeeklyHours, naira } from "@/lib/bookings/format";
import { listRooms } from "@/lib/bookings/store";
import { can } from "@/lib/sections";
import { mediaStorage, viewUrl } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { VisibilitySwitch } from "./visibility-switch";

export const metadata: Metadata = { title: "Rooms" };

export default async function RoomsPage() {
  const viewer = await requireSection("bookings");
  const canEdit = can(viewer.access, "bookings", "editor");
  const [rooms, storage] = await Promise.all([listRooms(), mediaStorage()]);
  const covers = await Promise.all(rooms.map((r) => (r.photos[0] ? viewUrl(storage, r.photos[0].key) : null)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rooms"
        description="Pricing, opening hours, photos and who can book each space."
        actions={
          canEdit && (
            <Link href="/bookings/rooms/new" className={buttonStyles()}>
              <Plus size={16} /> Add room
            </Link>
          )
        }
      />

      <ul className="grid gap-6 md:grid-cols-2">
        {rooms.map((room, i) => (
          <li key={room.id}>
            <Card className="flex h-full flex-col overflow-hidden">
              <div className="relative aspect-video overflow-hidden bg-sunk">
                {covers[i] ? (
                  <img src={covers[i]} alt={room.photos[0].alt} className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-1 text-sm text-subtle">
                    <ImageIcon size={22} strokeWidth={1.5} aria-hidden="true" />
                    No photos yet
                  </span>
                )}
                {room.photos.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
                    {room.photos.length} photos
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-ink-strong">{room.name}</h2>
                    <p className="text-sm text-subtle">Up to {room.capacity} people</p>
                  </div>
                  {room.visibility === "staff" ? (
                    <Badge tone="cobalt">Staff only</Badge>
                  ) : (
                    <Badge tone="confirmed">Everyone</Badge>
                  )}
                </div>

                <dl className="divide-y divide-line-soft border-y border-line-soft text-sm">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-subtle">Hourly rate</dt>
                    <dd className="font-semibold text-ink">{naira(room.hourlyRate)} / hr</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-4">
                    <dt className="shrink-0 text-subtle">Opening hours</dt>
                    <dd className="text-ink sm:text-right">{formatWeeklyHours(room.hours)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-4">
                    <dt className="shrink-0 text-subtle">Closed on</dt>
                    <dd className="text-ink sm:text-right">
                      {[
                        room.closedOnPublicHolidays && "Public holidays",
                        room.closedDates.length > 0 &&
                          `${room.closedDates.length} other date${room.closedDates.length === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(", ") || "No closed dates"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-2 py-3">
                    <dt className="text-subtle">What’s included</dt>
                    <dd>
                      {room.included.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {room.included.map((a) => (
                            <li key={a} className="rounded-full bg-sunk px-3 py-1 text-xs font-medium text-ink">
                              {a}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-subtle">None listed</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <VisibilitySwitch
                  key={room.visibility}
                  roomId={room.id}
                  roomName={room.name}
                  visibility={room.visibility}
                  disabled={!canEdit}
                />

                {canEdit && (
                  <Link
                    href={`/bookings/rooms/${room.id}`}
                    className={buttonStyles({ variant: "secondary", className: "mt-auto w-full" })}
                  >
                    <Pencil size={16} /> Edit details and photos
                  </Link>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
