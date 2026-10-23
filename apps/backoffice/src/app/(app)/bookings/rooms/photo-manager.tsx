"use client";
/* eslint-disable @next/next/no-img-element -- photos come from object storage, which may be another host */
// Room photos: cropped to the standard size in the browser, uploaded straight to storage with a signed link, then confirmed.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { MAX_PHOTO_BYTES, MIN_PHOTO_SIZE, PHOTO_SIZE, PHOTO_TYPES } from "@/lib/bookings/types";
import { confirmPhotoUpload, deletePhoto, makeCover, requestPhotoUpload, type PhotoOwner } from "./actions";

/**
 * Makes every photo the same size: crops the middle 16:9 part and scales it to 1920×1080 JPEG, so covers and
 * galleries line up everywhere and storage stays small. Refuses photos smaller than 1280×720.
 */
async function standardise(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width: w, height: h } = bitmap;
  if (w < MIN_PHOTO_SIZE.width || h < MIN_PHOTO_SIZE.height) {
    bitmap.close();
    throw new Error(
      `${file.name} is ${w}×${h}. Photos must be at least ${MIN_PHOTO_SIZE.width}×${MIN_PHOTO_SIZE.height}.`,
    );
  }
  const target = PHOTO_SIZE.width / PHOTO_SIZE.height;
  // The largest 16:9 area in the middle of the photo
  const cropW = w / h > target ? Math.round(h * target) : w;
  const cropH = w / h > target ? h : Math.round(w / target);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE.width;
  canvas.height = PHOTO_SIZE.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't process that photo");
  if (blob.size > MAX_PHOTO_BYTES) throw new Error(`${file.name} is too detailed to save under 5 MB`);
  return blob;
}

export interface PhotoView {
  key: string;
  url: string;
  alt: string;
}

export function PhotoManager({
  owner,
  roomName,
  photos,
  max,
  canEdit,
}: {
  owner: PhotoOwner;
  roomName: string;
  photos: PhotoView[];
  max: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  async function upload(files: File[]) {
    setError(null);
    setBusy(true);
    const room = Math.max(0, max - photos.length);
    if (files.length > room) setError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added`);
    try {
      for (const [i, file] of files.slice(0, room).entries()) {
        setStatus(`Uploading ${i + 1} of ${Math.min(files.length, room)}…`);
        if (!(file.type in PHOTO_TYPES)) throw new Error(`${file.name}: photos must be JPEG, PNG or WebP`);
        const blob = await standardise(file);
        const contentType = blob.type || file.type;
        const signed = await requestPhotoUpload(owner, { contentType, size: blob.size });
        if (!signed.ok) throw new Error(signed.error);
        const res = await fetch(signed.upload!.url, { method: "PUT", headers: signed.upload!.headers, body: blob });
        if (!res.ok) throw new Error(`${file.name}: upload failed (${res.status})`);
        const confirmed = await confirmPhotoUpload(owner, signed.key!, `${roomName} photo`);
        if (!confirmed.ok) throw new Error(confirmed.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setStatus(null);
      if (input.current) input.current.value = "";
      router.refresh();
    }
  }

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {photos.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
          No photos yet. The first photo is the cover customers see first.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.key} className="group relative overflow-hidden rounded-md border border-line-soft bg-sunk">
              <img src={p.url} alt={p.alt} className="aspect-video w-full object-cover" loading="lazy" />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
                  Cover
                </span>
              )}
              {canEdit && (
                <div className="flex justify-end gap-1 bg-white p-1.5">
                  {i > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending || busy}
                      onClick={() => act(() => makeCover(owner, p.key))}
                    >
                      <Star size={14} /> Make cover
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Delete photo"
                    disabled={pending || busy}
                    className="text-error-ink"
                    onClick={() => confirm("Delete this photo?") && act(() => deletePhoto(owner, p.key))}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept={Object.keys(PHOTO_TYPES).join(",")}
            multiple
            className="sr-only"
            id="room-photos"
            disabled={busy || photos.length >= max}
            onChange={(e) => upload([...(e.target.files ?? [])])}
          />
          <label
            htmlFor="room-photos"
            className={cn(
              "inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-sunk",
              (busy || photos.length >= max) && "pointer-events-none opacity-50",
            )}
          >
            <ImagePlus size={16} /> {busy ? status : "Add photos"}
          </label>
          <span className="text-xs text-subtle">
            {photos.length} of {max} · JPEG, PNG or WebP, at least {MIN_PHOTO_SIZE.width}×{MIN_PHOTO_SIZE.height} ·
            cropped to 16:9 ({PHOTO_SIZE.width}×{PHOTO_SIZE.height}) from the centre
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
