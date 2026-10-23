import { cn } from "@/lib/cn";

const TONES = {
  success: { ring: "border-green/40", fill: "bg-green", glyph: "M7 12.5l3.2 3.2L17 9" },
  pending: { ring: "border-pending/40", fill: "bg-pending", glyph: "M12 7v5l3 2" },
  error: { ring: "border-error/40", fill: "bg-error", glyph: "M8.5 8.5l7 7M15.5 8.5l-7 7" },
};

/** The big round status icon on result screens (All set, Payment pending, Payment unsuccessful) */
export function StatusMark({ tone, className }: { tone: keyof typeof TONES; className?: string }) {
  const t = TONES[tone];
  return (
    <span
      className={cn("flex size-[90px] items-center justify-center rounded-full border-2 bg-white", t.ring, className)}
      aria-hidden
    >
      <span className={cn("flex size-[60px] items-center justify-center rounded-full", t.fill)}>
        <svg
          viewBox="0 0 24 24"
          className="size-8"
          fill="none"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {tone === "pending" && <circle cx="12" cy="12" r="7" />}
          <path d={t.glyph} />
        </svg>
      </span>
    </span>
  );
}
