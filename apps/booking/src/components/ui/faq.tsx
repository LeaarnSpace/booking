import type { Faq } from "@learnspace/bookings/client";
import { Icon } from "./icon";

/** Questions with a green edge, opening in place (no script needed) */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((f) => (
        <details key={f.question} className="group rounded-l-[5px] border-l-4 border-green py-2 pl-5 pr-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-2 text-base font-medium tracking-[0.014em] text-ink-strong [&::-webkit-details-marker]:hidden">
            <span className="max-w-[640px]">{f.question}</span>
            <Icon name="add-ring" className="transition-transform group-open:rotate-45" />
          </summary>
          <p className="max-w-[640px] pb-2 text-base text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
