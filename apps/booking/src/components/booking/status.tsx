import type { BookingStatus } from "@learnspace/bookings/client";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<BookingStatus, { label: string; tone: "green" | "pending" | "error" | "grey" }> = {
  hold: { label: "Awaiting payment", tone: "pending" },
  pending: { label: "Payment pending", tone: "pending" },
  confirmed: { label: "Confirmed", tone: "green" },
  declined: { label: "Payment declined", tone: "error" },
  cancelled: { label: "Cancelled", tone: "grey" },
  expired: { label: "Expired", tone: "grey" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = LABELS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
