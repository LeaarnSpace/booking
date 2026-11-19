"use client";
// Per-role controls on the list: where it shows on the website (saves straight away) and its place in the order.
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { VISIBILITIES, VISIBILITY_LABELS, type Visibility } from "@learnspace/website-content/client";
import { moveRole, setRoleVisibility } from "../actions";

const tone: Record<Visibility, string> = {
  listed: "border-confirmed/50 bg-confirmed-50 text-confirmed-ink",
  link: "border-cobalt-200 bg-cobalt-50 text-cobalt-600",
  hidden: "border-line bg-sunk text-subtle",
};

export function RoleControls({
  id,
  title,
  visibility,
  first,
  last,
  disabled,
}: {
  id: string;
  title: string;
  visibility: Visibility;
  first: boolean;
  last: boolean;
  disabled: boolean;
}) {
  const [value, setValue] = useState(visibility);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <select
          aria-label={`${title}: on the website`}
          title={disabled ? "Editor access needed" : VISIBILITY_LABELS[value].hint}
          value={value}
          disabled={disabled || pending}
          onChange={(e) => {
            const next = e.target.value as Visibility;
            const previous = value;
            setValue(next);
            setError(null);
            start(async () => {
              const result = await setRoleVisibility(id, next);
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
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v].label}
            </option>
          ))}
        </select>
        {!disabled && (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${title} up`}
              disabled={first || pending}
              onClick={() => start(() => moveRole(id, "up"))}
              className="px-2"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${title} down`}
              disabled={last || pending}
              onClick={() => start(() => moveRole(id, "down"))}
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
