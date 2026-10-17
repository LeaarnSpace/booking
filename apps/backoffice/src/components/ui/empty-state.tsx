import type { LucideIcon } from "lucide-react";

/** Friendly placeholder for screens with nothing to show yet */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-white px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h2 className="text-base font-bold text-ink-strong">{title}</h2>
      {children && <div className="max-w-md text-sm text-subtle">{children}</div>}
    </div>
  );
}
