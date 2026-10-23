"use client";
import { cn } from "@/lib/cn";

/** − count + control. `large` is the attendee counter; the small one is for add-ons. */
export function Counter({
  value,
  min = 0,
  max,
  onChange,
  label,
  large,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  large?: boolean;
}) {
  const button = large ? "size-11 rounded-lg text-xl" : "size-5 rounded-sm text-lg leading-none";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center rounded-md bg-sunk p-1",
        large ? "w-full justify-between border border-line" : "gap-3",
      )}
    >
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={cn(
          "flex items-center justify-center font-semibold disabled:opacity-40",
          button,
          large ? "bg-[#ebedf7] text-[#595c78]" : "bg-white text-ink-strong",
        )}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center text-base tracking-[0.014em]",
          large ? "flex-1 text-subtle" : "min-w-3 text-[#33364d]",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={cn(
          "flex items-center justify-center bg-primary font-semibold text-white disabled:opacity-40",
          button,
        )}
      >
        +
      </button>
    </div>
  );
}
