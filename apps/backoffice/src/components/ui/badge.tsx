import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeStyles = cva("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      cobalt: "bg-cobalt-50 text-cobalt-600",
      neutral: "bg-sunk text-subtle",
      beam: "bg-beam-400/20 text-[#7a4f00]",
      pending: "bg-pending-50 text-pending-ink ring-1 ring-inset ring-pending/60",
      confirmed: "bg-confirmed-50 text-confirmed-ink ring-1 ring-inset ring-confirmed/50",
      error: "bg-error-50 text-error-ink ring-1 ring-inset ring-error/50",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}
