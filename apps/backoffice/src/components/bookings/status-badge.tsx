import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/bookings/types";

const STATUS: Record<BookingStatus, { label: string; tone: "pending" | "confirmed" | "error" | "neutral" | "cobalt" }> =
  {
    hold: { label: "On hold", tone: "cobalt" },
    pending: { label: "Needs review", tone: "pending" },
    confirmed: { label: "Confirmed", tone: "confirmed" },
    declined: { label: "Declined", tone: "error" },
    cancelled: { label: "Cancelled", tone: "neutral" },
    expired: { label: "Expired", tone: "neutral" },
  };

/** Booking status pill. A hold close to running out shows as "Hold expiring". */
export function StatusBadge({ status, expiring }: { status: BookingStatus; expiring?: boolean }) {
  if (status === "hold" && expiring) return <Badge tone="error">Hold expiring</Badge>;
  const { label, tone } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
