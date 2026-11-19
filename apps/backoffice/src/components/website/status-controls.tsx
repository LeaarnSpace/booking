"use client";
// Per-item controls on the news and blog lists: Live or Draft (saves straight away) and, where the list has a
// hand-set order, up and down arrows.
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { STATUSES, STATUS_LABELS, type Result, type Status } from "@learnspace/website-content/client";

const tone: Record<Status, string> = {
  live: "border-confirmed/50 bg-confirmed-50 text-confirmed-ink",
  draft: "border-line bg-sunk text-subtle",
};

export function StatusControls({
  id,
  title,
  status,
  setStatus,
  move,
  first,
  last,
  disabled,
}: {
  id: string;
  title: string;
  status: Status;
  setStatus: (id: string, status: Status) => Promise<Result>;
  /** Only for lists in a hand-set order */
  move?: (id: string, direction: "up" | "down") => Promise<void>;
  first?: boolean;
  last?: boolean;
  disabled: boolean;
}) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <select
          aria-label={`${title}: on the website`}
          title={disabled ? "Editor access needed" : STATUS_LABELS[value].hint}
          value={value}
          disabled={disabled || pending}
          onChange={(e) => {
            const next = e.target.value as Status;
            const previous = value;
            setValue(next);
            setError(null);
            start(async () => {
              const result = await setStatus(id, next);
              if (!result.ok) {
                setValue(previous);
                setError(result.error);
              }
            });
          }}
          className={cn(
            "mr-1 h-8 rounded-full border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-80",
            tone[value],
          )}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s].label}
            </option>
          ))}
        </select>
        {move && !disabled && (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${title} up`}
              disabled={first || pending}
              onClick={() => start(() => move(id, "up"))}
              className="px-2"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${title} down`}
              disabled={last || pending}
              onClick={() => start(() => move(id, "down"))}
              className="px-2"
            >
              <ArrowDown size={16} />
            </Button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
