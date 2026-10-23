/* eslint-disable @next/next/no-img-element -- icons are the design's own SVG files */
import { cn } from "@/lib/cn";

export const ICONS = [
  "add-ring",
  "arrow-left",
  "bell-pin",
  "calendar-fill",
  "calendar-light",
  "calendar-small",
  "cancel",
  "caret-left",
  "caret-right",
  "check-ring",
  "clock",
  "home-fill",
  "home-light",
  "lock",
  "question-fill",
  "question-light",
  "time-fill",
  "user-circle-fill",
  "user-circle-light",
] as const;
export type IconName = (typeof ICONS)[number];

/** One of the design's icons (public/icons). Decorative unless given a label. */
export function Icon({
  name,
  size = 24,
  label,
  className,
}: {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
