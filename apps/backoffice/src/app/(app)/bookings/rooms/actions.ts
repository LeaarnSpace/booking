"use server";
// Room changes, service details, and photos for both. Every action re-checks that the caller is at least an editor of Bookings.
// Photos go straight from the browser to media storage: the server signs an upload link for one file of a
// given type and size, then checks the stored file before adding it to the room.
import { redirect } from "next/navigation";
import { z } from "zod";
import { admin } from "@learnspace/bookings";
import { catalogChanged } from "@/lib/booking-app";
import * as store from "@/lib/bookings/store";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/bookings/types";
import { mediaStorage } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";

type Result = store.Result;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour times like 08:00");
const day = z
  .object({ open: time, close: time })
  .refine((d) => d.open < d.close, "Closing time must be after opening time")
  .nullable();

const roomInput = z.object({
  name: z.string().trim().min(2, "Give the room a name").max(60),
  tagline: z.string().trim().max(160, "Keep the card text under 160 characters"),
  description: z.string().trim().max(500, "Keep the description under 500 characters"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(500),
  hourlyRate: z.coerce.number().int("Use whole naira").min(0).max(10_000_000),
  visibility: z.enum(["everyone", "staff"]),
  hours: z.array(day).length(7),
  closedDates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
        label: z.string().trim().max(60),
      }),
    )
    .max(100),
  closedOnPublicHolidays: z.boolean(),
  included: z.array(z.string().trim().min(1).max(40)).max(30, "Up to 30 included items"),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(3, "Each question needs some text").max(160),
        answer: z.string().trim().min(1, "Each question needs an answer").max(600),
      }),
    )
    .max(12, "Up to 12 questions"),
});

function parseRoom(form: FormData) {
  const json = (name: string) => {
    try {
      return JSON.parse(String(form.get(name) ?? "null"));
    } catch {
      return null;
    }
  };
  return roomInput.safeParse({
    name: form.get("name"),
    tagline: form.get("tagline") ?? "",
    description: form.get("description") ?? "",
    capacity: form.get("capacity"),
    hourlyRate: form.get("hourlyRate"),
    visibility: form.get("visibility"),
    hours: json("hours"),
    closedDates: json("closedDates"),
    closedOnPublicHolidays: form.get("closedOnPublicHolidays") === "on",
    included: json("included"),
    faqs: json("faqs") ?? [],
  });
}

export async function saveRoom(roomId: string | null, _: Result | null, form: FormData): Promise<Result> {
  await requireSection("bookings", "editor");
  const parsed = parseRoom(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  if (roomId) {
    const result = await store.updateRoom(roomId, parsed.data);
    if (!result.ok) return result;
  } else {
    const result = await store.createRoom(parsed.data);
    if (!result.ok) return result;
    roomId = result.id;
  }
  catalogChanged();
  redirect(`/bookings/rooms/${roomId}?done=${form.get("isNew") ? "created" : "saved"}`);
}

// Photos, for rooms and their services

/** Whose photos: a room (space) or one of its services. Keys start with "rooms/<id>/" or "services/<id>/". */
export type PhotoOwner = { kind: "room" | "service"; id: string };

const photoKey = z.string().regex(/^(rooms|services)\/[a-z0-9-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
const prefix = (owner: PhotoOwner) => `${owner.kind === "room" ? "rooms" : "services"}/${owner.id}/`;

async function photosOf(owner: PhotoOwner) {
  const record = owner.kind === "room" ? await store.getRoom(owner.id) : await admin.getServiceRecord(owner.id);
  return record?.photos ?? null;
}

export async function requestPhotoUpload(
  owner: PhotoOwner,
  file: { contentType: string; size: number },
): Promise<Result & { upload?: { url: string; headers: Record<string, string> }; key?: string }> {
  await requireSection("bookings", "editor");
  const photos = await photosOf(owner);
  if (!photos) return { ok: false, error: "Not found" };
  if (photos.length >= admin.MAX_PHOTOS) return { ok: false, error: `Up to ${admin.MAX_PHOTOS} photos each` };
  const ext = PHOTO_TYPES[file.contentType as keyof typeof PHOTO_TYPES];
  if (!ext) return { ok: false, error: "Photos must be JPEG, PNG or WebP" };
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photos must be under 5 MB" };
  }

  const key = `${prefix(owner)}${crypto.randomUUID()}.${ext}`;
  const upload = await (await mediaStorage()).createUploadUrl(key, { contentType: file.contentType, size: file.size });
  return { ok: true, key, upload: { url: upload.url, headers: upload.headers } };
}

export async function confirmPhotoUpload(owner: PhotoOwner, key: string, alt: string): Promise<Result> {
  await requireSection("bookings", "editor");
  if (!photoKey.safeParse(key).success || !key.startsWith(prefix(owner))) return { ok: false, error: "Unknown photo" };
  const storage = await mediaStorage();
  const info = await storage.head(key);
  if (!info) return { ok: false, error: "The upload didn't arrive. Please try again." };
  // The signed link fixes type and size, but check what actually arrived before using it
  if (!(info.contentType && info.contentType in PHOTO_TYPES) || info.size > MAX_PHOTO_BYTES) {
    await storage.delete(key);
    return { ok: false, error: "That file isn't a supported photo" };
  }

  const photo = { key, alt: alt.trim().slice(0, 120) };
  const result =
    owner.kind === "room" ? await store.addRoomPhoto(owner.id, photo) : await admin.addServicePhoto(owner.id, photo);
  if (!result.ok) {
    await storage.delete(key);
    return result;
  }
  catalogChanged();
  return { ok: true };
}

export async function deletePhoto(owner: PhotoOwner, key: string): Promise<Result> {
  await requireSection("bookings", "editor");
  const photos = await photosOf(owner);
  if (!photos?.some((p) => p.key === key)) return { ok: false, error: "Photo not found" };
  await (await mediaStorage()).delete(key);
  const result =
    owner.kind === "room" ? await store.removeRoomPhoto(owner.id, key) : await admin.removeServicePhoto(owner.id, key);
  if (result.ok) catalogChanged();
  return result;
}

export async function makeCover(owner: PhotoOwner, key: string): Promise<Result> {
  await requireSection("bookings", "editor");
  const result =
    owner.kind === "room" ? await store.makeCoverPhoto(owner.id, key) : await admin.makeServiceCover(owner.id, key);
  if (result.ok) catalogChanged();
  return result;
}

// Service details

const faqs = z
  .array(
    z.object({
      question: z.string().trim().min(3, "Each question needs some text").max(160),
      answer: z.string().trim().min(1, "Each question needs an answer").max(600),
    }),
  )
  .max(12, "Up to 12 questions");

const serviceDetails = z.object({
  name: z.string().trim().min(2, "Give the service a name").max(60),
  description: z.string().trim().max(500, "Keep the description under 500 characters"),
  included: z.array(z.string().trim().min(1).max(40)).max(30, "Up to 30 included items"),
  faqs,
});

export async function saveServiceDetails(
  roomId: string,
  serviceId: string,
  _: Result | null,
  form: FormData,
): Promise<Result> {
  await requireSection("bookings", "editor");
  const json = (name: string) => {
    try {
      return JSON.parse(String(form.get(name) ?? "null"));
    } catch {
      return null;
    }
  };
  const parsed = serviceDetails.safeParse({
    name: form.get("name"),
    description: form.get("description") ?? "",
    included: json("included"),
    faqs: json("faqs"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const result = await admin.updateServiceDetails(serviceId, parsed.data);
  if (!result.ok) return result;
  catalogChanged();
  redirect(`/bookings/rooms/${roomId}/services/${serviceId}?done=saved`);
}
