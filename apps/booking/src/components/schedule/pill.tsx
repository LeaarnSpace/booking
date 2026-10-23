import Link from "next/link";
import type { ScheduleEntry } from "@learnspace/bookings";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatTime12 } from "@/lib/format";

const range = (e: ScheduleEntry) => `${formatTime12(e.start)}–${formatTime12(e.end)}`.replace(/ /g, "");

/** A booking on the calendar: your own in green (links to it), anyone else's greyed with a lock */
export function SchedulePill({ entry, className }: { entry: ScheduleEntry; className?: string }) {
  if (entry.mine && entry.ref) {
    return (
      <Link
        href={`/bookings/${entry.ref}`}
        className={cn(
          "flex w-full flex-col rounded-sm border-t-[3px] border-green bg-green-50 pb-1.5 pl-2.5 pr-1.5 pt-2 hover:brightness-[0.98]",
          className,
        )}
      >
        <span className="truncate text-sm text-ink">{entry.label}</span>
        <span className="text-sm text-ink">
          <b className="font-semibold">-</b> You
          {entry.status !== "confirmed" && (
            <span className="text-subtle"> · {entry.status === "hold" ? "awaiting payment" : "in review"}</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium tracking-[0.014em] text-subtle">
          <Icon name="clock" size={14} />
          {range(entry)}
        </span>
      </Link>
    );
  }
  return (
    <div className={cn("flex w-full flex-col gap-1 rounded-sm border-[0.5px] border-muted bg-line p-1.5", className)}>
      <span className="flex items-center gap-1 text-sm text-ink-strong">
        <Icon name="lock" size={14} />
        <span className="truncate">{entry.label}</span>
      </span>
      <span className="text-xs text-ink">Booked</span>
      <span className="flex items-center gap-1 text-[11px] tracking-[0.014em] text-subtle">
        <Icon name="clock" size={14} />
        {range(entry)}
      </span>
    </div>
  );
}
