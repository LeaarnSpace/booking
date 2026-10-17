import { cn } from "@/lib/cn";

/** The Learn Space square mark */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[6px] bg-cobalt-600 font-extrabold leading-[1.05] text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.2 }}
      aria-hidden="true"
    >
      <span className="text-left">
        LEARN
        <br />
        SPACE
      </span>
    </span>
  );
}
