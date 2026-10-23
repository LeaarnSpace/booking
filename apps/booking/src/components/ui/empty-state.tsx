/* eslint-disable @next/next/no-img-element -- the design's own illustration */
import { ButtonLink } from "./button";

/** The design's empty state: the sad calendar, a heading, a line of text and "Browse Schedule" */
export function EmptyState({
  title,
  text,
  action = { href: "/schedule", label: "Browse Schedule" },
}: {
  title: string;
  text: string;
  action?: { href: string; label: string } | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[476px] flex-col items-center gap-3 py-8 text-center">
      <img
        src="/illustrations/empty-calendar.png"
        alt=""
        width={206}
        height={176}
        className="h-[150px] w-auto md:h-[176px]"
      />
      <h2 className="text-2xl font-bold tracking-[0.012em] text-ink md:text-[28px]">{title}</h2>
      <p className="text-base font-bold text-placeholder md:text-xl">{text}</p>
      {action && (
        <ButtonLink href={action.href} className="mt-1">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
