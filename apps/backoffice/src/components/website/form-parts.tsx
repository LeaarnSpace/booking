// Building blocks shared by the website content forms (roles, news, blog): a titled card and a labelled field.
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const inputStyles =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-subtle disabled:bg-sunk";

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-ink-strong">{title}</h2>
        {hint && <p className="text-sm text-subtle">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-semibold text-ink", className)}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-subtle">{hint}</span>}
    </label>
  );
}
