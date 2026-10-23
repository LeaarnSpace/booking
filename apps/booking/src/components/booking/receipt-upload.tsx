"use client";
// Proof of payment: pick a file, it goes straight to storage with a signed link, then the server checks it and
// passes the booking to staff for review. Photos of receipts are shrunk first, so uploads are quick on mobile data.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_RECEIPT_BYTES, RECEIPT_TYPES } from "@learnspace/bookings/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/format";
import { confirmReceipt, requestReceiptUpload } from "@/app/(site)/bookings/actions";

const MAX_EDGE = 2000;

/** Large JPEG/PNG photos are scaled down and re-encoded; PDFs and HEIC go as they are */
async function shrink(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return blob ?? file;
}

const kb = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}kb` : `${(bytes / 1024 / 1024).toFixed(1)}mb`;

export function ReceiptUpload({ bookingRef, total }: { bookingRef: string; total: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function choose(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!(f.type in RECEIPT_TYPES)) return setError("Upload a PDF, JPG, PNG or HEIC file");
    if (f.size > MAX_RECEIPT_BYTES * 4) return setError("That file is too large. Receipts must be under 5 MB.");
    setFile(f);
  }

  async function send() {
    if (!file) return setError("Upload your receipt first");
    setError(null);
    try {
      setStatus("Preparing…");
      const blob = await shrink(file);
      if (blob.size > MAX_RECEIPT_BYTES) throw new Error("Receipts must be under 5 MB");
      const contentType = blob.type || file.type;
      setStatus("Uploading…");
      const signed = await requestReceiptUpload(bookingRef, { contentType, size: blob.size });
      if (!signed.ok) throw new Error(signed.error);
      const res = await fetch(signed.upload!.url, { method: "PUT", headers: signed.upload!.headers, body: blob });
      if (!res.ok) throw new Error(`Upload failed (${res.status}). Please try again.`);
      setStatus("Checking…");
      const confirmed = await confirmReceipt(bookingRef, signed.key!, file.name);
      if (!confirmed.ok) throw new Error(confirmed.error);
      router.replace(`/bookings/${bookingRef}?done=paid`);
      router.refresh();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium text-ink-strong">Proof of Payment</h2>
        <p className="text-sm font-medium text-subtle">Upload your receipt here (PDF, JPG, PNG or HEIC, up to 5 MB)</p>
        <input
          ref={input}
          id="receipt"
          type="file"
          accept={Object.keys(RECEIPT_TYPES).join(",")}
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <label
          htmlFor="receipt"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
          className={cn(
            "mx-auto mt-6 flex h-[275px] w-full max-w-[350px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-muted bg-sunk text-sm text-muted hover:bg-blue-100/50",
            file && "border-green bg-green-50",
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="#4a4d6a"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M12 15V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
          </svg>
          {file ? (
            <span className="max-w-[280px] text-center">
              <b className="block truncate text-ink">{file.name}</b>
              {kb(file.size)} · tap to change
            </span>
          ) : (
            "Tap to upload"
          )}
        </label>
      </section>
      <div className="fixed inset-x-0 bottom-[72px] z-20 border-t border-line bg-white md:static md:mt-6 md:border-0">
        <div className="mx-auto flex max-w-[792px] flex-col gap-3 px-4 py-4 md:px-0">
          {error && (
            <p role="alert" className="text-sm text-error-ink">
              {error}
            </p>
          )}
          <p className="flex items-center justify-between text-base font-medium text-ink-strong">
            Total:<span className="text-xl font-bold">{naira(total)}</span>
          </p>
          <Button onClick={send} disabled={Boolean(status)}>
            {status ?? "Confirm"}
          </Button>
        </div>
      </div>
    </>
  );
}
