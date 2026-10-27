"use server";
// A customer's own bookings: uploading the payment receipt, retrying a declined payment, cancelling.
// Receipts go straight from the browser to the private receipts bucket: the server signs an upload link for one
// file of a given type and size, then checks what arrived before moving the booking on to staff review.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelBooking, getCustomerBooking, retryPayment, submitReceipt } from "@learnspace/bookings";
import { CANCEL_REASONS, MAX_RECEIPT_BYTES, RECEIPT_TYPES } from "@learnspace/bookings/client";
import { env } from "@/lib/env";
import { sendQueuedMessagesSoon } from "@/lib/messages";
import { receiptStorage } from "@/lib/storage";
import { getViewer } from "@/lib/viewer";

type Result = { ok: true } | { ok: false; error: string };

async function own(ref: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const booking = await getCustomerBooking(viewer.id, ref);
  return booking ? { viewer, booking } : null;
}

const keyFor = (ref: string, ext: string) => `receipts/${ref}/${crypto.randomUUID()}.${ext}`;
const receiptKey = (ref: string) => new RegExp(`^receipts/${ref}/[0-9a-f-]{36}\\.(pdf|jpg|png|heic)$`);

export async function requestReceiptUpload(
  ref: string,
  file: { contentType: string; size: number },
): Promise<Result & { upload?: { url: string; headers: Record<string, string> }; key?: string }> {
  const found = await own(ref);
  if (!found) return { ok: false, error: "Booking not found" };
  if (found.booking.status !== "hold") return { ok: false, error: "This booking isn't waiting for a receipt" };
  const ext = RECEIPT_TYPES[file.contentType as keyof typeof RECEIPT_TYPES];
  if (!ext) return { ok: false, error: "Upload a PDF, JPG, PNG or HEIC file" };
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_RECEIPT_BYTES) {
    return { ok: false, error: "Receipts must be under 5 MB" };
  }
  const key = keyFor(ref, ext);
  // Five minutes is plenty for one upload
  const upload = await (
    await receiptStorage()
  ).createUploadUrl(key, { contentType: file.contentType, size: file.size, expiresIn: 300 });
  return { ok: true, key, upload: { url: upload.url, headers: upload.headers } };
}

export async function confirmReceipt(ref: string, key: string, fileName: string): Promise<Result> {
  const found = await own(ref);
  if (!found) return { ok: false, error: "Booking not found" };
  if (!receiptKey(ref).test(key)) return { ok: false, error: "Unknown upload" };
  const storage = await receiptStorage();
  const info = await storage.head(key);
  if (!info) return { ok: false, error: "The upload didn't arrive. Please try again." };
  if (!(info.contentType && info.contentType in RECEIPT_TYPES) || info.size > MAX_RECEIPT_BYTES) {
    await storage.delete(key);
    return { ok: false, error: "That file isn't a supported receipt" };
  }
  const result = await submitReceipt(found.viewer.id, ref, {
    key,
    fileName: fileName.replace(/[^\w.\- ]/g, "").slice(0, 100) || "receipt",
    contentType: info.contentType,
    size: info.size,
    uploadedAt: new Date().toISOString(),
  });
  if (!result.ok) {
    await storage.delete(key);
    return result;
  }
  sendQueuedMessagesSoon();
  revalidatePath("/bookings", "layout");
  return { ok: true };
}

export async function retry(ref: string): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please log in again" };
  const result = await retryPayment(viewer.id, ref, env.holdMinutes);
  if (!result.ok) return result;
  sendQueuedMessagesSoon();
  redirect(`/bookings/${ref}/pay`);
}

export async function cancel(ref: string, _: Result | null, form: FormData): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please log in again" };
  const reason = String(form.get("reason") ?? "");
  if (!(CANCEL_REASONS as readonly string[]).includes(reason)) return { ok: false, error: "Choose a reason" };
  const other = String(form.get("other") ?? "").trim();
  if (reason === "Other" && other.length < 3) return { ok: false, error: "Tell us briefly why you're cancelling" };
  const result = await cancelBooking(viewer.id, ref, reason === "Other" ? `Other: ${other}` : reason);
  if (!result.ok) return result;
  sendQueuedMessagesSoon();
  revalidatePath("/bookings", "layout");
  redirect(`/bookings/${ref}?done=cancelled`);
}
