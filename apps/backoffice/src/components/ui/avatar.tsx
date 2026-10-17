/* eslint-disable @next/next/no-img-element -- Google profile photos come from many hosts */
import { cn } from "@/lib/cn";

/** Profile photo, or initials when there isn't one */
export function Avatar({
  name,
  image,
  size = 32,
  className,
}: {
  name: string;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return image ? (
    <img
      src={image}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-cobalt-100 font-bold text-cobalt-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
