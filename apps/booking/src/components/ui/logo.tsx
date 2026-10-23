/* eslint-disable @next/next/no-img-element -- static brand artwork from the design */
import { cn } from "@/lib/cn";

/** The Learn Space square mark: the two wordmark parts on cobalt, placed as in the Figma logo component */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative block size-14 shrink-0 rounded-sm bg-primary md:size-20", className)}>
      <span className="absolute inset-[36.41%_29.12%_53.26%_29.12%]">
        <img alt="" src="/brand/logo-top.svg" className="absolute inset-0 block size-full max-w-none" />
      </span>
      <span className="absolute inset-[53.42%_29.12%_36.25%_29.12%]">
        <img alt="" src="/brand/logo-bottom.svg" className="absolute inset-0 block size-full max-w-none" />
      </span>
      <span className="sr-only">Learn Space</span>
    </span>
  );
}
