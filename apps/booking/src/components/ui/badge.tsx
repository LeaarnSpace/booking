import { cn } from "@/lib/cn";

const TONES = {
  blue: "bg-blue-100 text-blue-700",
  green: "border border-green bg-green-50 text-green-ink",
  pending: "border border-pending bg-pending-50 text-pending-ink",
  error: "border border-error bg-error-50 text-error-ink",
  grey: "border border-line bg-sunk text-muted",
};

export function Badge({
  tone = "blue",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium leading-[14px] tracking-[0.014em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
