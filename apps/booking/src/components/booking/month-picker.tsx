"use client";
import { useState } from "react";
import { addDays, closedReason, lagosIsoDate, weekdayIndex, type OpeningRules } from "@learnspace/bookings/client";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const monthTitle = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Small month calendar: past and closed days are struck through, the chosen day is green */
export function MonthPicker({
  value,
  rules,
  onChange,
}: {
  value: string;
  rules: OpeningRules;
  onChange: (date: string) => void;
}) {
  const today = lagosIsoDate(new Date());
  const [month, setMonth] = useState(value.slice(0, 7));
  const first = `${month}-01`;
  const lead = weekdayIndex(first);
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
    setMonth(next);
  };

  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3 rounded-md bg-sunk p-3 drop-shadow-[0_1px_1px_rgba(14,22,80,0.06)]">
      <div className="flex items-center justify-between pl-1">
        <p className="text-lg font-bold tracking-[0.012em] text-ink">
          {Number(value.slice(8))} {monthTitle(first)}
        </p>
        <div className="flex">
          <button
            type="button"
            aria-label="Previous month"
            disabled={month <= today.slice(0, 7)}
            onClick={() => shift(-1)}
            className="flex size-8 items-center justify-center rounded-lg disabled:opacity-30"
          >
            <Icon name="caret-left" size={20} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="flex size-8 items-center justify-center rounded-lg"
          >
            <Icon name="caret-right" size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-base font-bold tracking-[0.05em] text-placeholder" aria-hidden>
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((d) => {
          const past = d < today;
          const closed = past ? "Past" : closedReason(rules, d);
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={Boolean(closed)}
              aria-pressed={selected}
              aria-label={`${d}${closed ? ` (${closed})` : ""}`}
              onClick={() => onChange(d)}
              className={cn(
                "mx-auto flex h-[30px] w-10 items-center justify-center rounded-sm text-sm font-medium tracking-[0.014em]",
                // Bookable days stand on white; past days fade out; closed days are struck through
                !closed && "bg-white text-ink shadow-sm hover:outline hover:outline-1 hover:outline-green",
                selected && "bg-green text-white",
                past && "text-line",
                closed && !past && "text-placeholder line-through",
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
