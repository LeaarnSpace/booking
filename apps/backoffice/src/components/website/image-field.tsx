"use client";
/* eslint-disable @next/next/no-img-element -- photos come from object storage, which may be another host */
// The photo for a news story or blog post. Big photos are scaled down in the browser, then uploaded straight to
// media storage with a signed link; the form saves the photo's key (in a hidden input) along with everything else.
// The website crops photos to fit each place they appear, so the middle of the photo should hold what matters.
import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_WIDTH, MIN_IMAGE_WIDTH } from "@learnspace/website-content/client";
import { requestImageUpload } from "@/app/(app)/website/actions";

/** Scales the photo down to MAX_IMAGE_WIDTH as a JPEG; refuses photos narrower than MIN_IMAGE_WIDTH */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width: w, height: h } = bitmap;
  if (w < MIN_IMAGE_WIDTH) {
    bitmap.close();
    throw new Error(`This photo is ${w} pixels wide. Use one at least ${MIN_IMAGE_WIDTH} wide, so it stays sharp.`);
  }
  const scale = Math.min(1, MAX_IMAGE_WIDTH / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn’t process that photo");
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("This photo is too detailed to save under 5 MB");
  return blob;
}

export function ImageField({
  area,
  name = "imageKey",
  label,
  hint,
  defaultKey,
  defaultUrl,
  aspect,
}: {
  area: "news" | "blog";
  name?: string;
  label: string;
  hint: string;
  defaultKey: string | null;
  defaultUrl: string | null;
  /** How the website shows it most, for the preview, e.g. "1312 / 502" */
  aspect: string;
}) {
  const [key, setKey] = useState(defaultKey ?? "");
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = `${name}-file`;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      if (!(file.type in IMAGE_TYPES)) throw new Error("Photos must be JPEG, PNG or WebP");
      const blob = await shrink(file);
      const signed = await requestImageUpload(area, { contentType: blob.type, size: blob.size });
      if (!signed.ok) throw new Error(signed.error);
      const res = await fetch(signed.upload!.url, { method: "PUT", headers: signed.upload!.headers, body: blob });
      if (!res.ok) throw new Error(`The upload failed (${res.status}). Please try again.`);
      setKey(signed.key!);
      setUrl((old) => {
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input type="hidden" name={name} value={key} />
      {url && key ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <img
            src={url}
            alt=""
            style={{ aspectRatio: aspect }}
            className="w-full max-w-md rounded-md border border-line-soft bg-sunk object-cover"
          />
          <div className="flex gap-2">
            <label
              htmlFor={id}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 font-semibold text-ink hover:bg-sunk",
                busy && "pointer-events-none opacity-50",
              )}
            >
              <RefreshCw size={14} aria-hidden="true" /> {busy ? "Uploading…" : "Replace"}
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-error-ink"
              disabled={busy}
              onClick={() => {
                setKey("");
                setUrl(null);
              }}
            >
              <Trash2 size={14} aria-hidden="true" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          style={{ aspectRatio: aspect }}
          className={cn(
            "flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-white px-4 text-center text-subtle hover:bg-sunk",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus size={20} aria-hidden="true" />
          <span className="font-semibold text-ink">{busy ? "Uploading…" : "Add a photo"}</span>
        </label>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={Object.keys(IMAGE_TYPES).join(",")}
        className="sr-only"
        disabled={busy}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <span className="text-xs text-subtle">{hint}</span>
      {error && (
        <p role="alert" className="text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
