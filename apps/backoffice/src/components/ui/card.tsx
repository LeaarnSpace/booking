import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-line-soft bg-white shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  );
}
