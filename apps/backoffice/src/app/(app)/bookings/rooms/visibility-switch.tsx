"use client";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { setRoomVisibility } from "../actions";

/** "Visible to everyone" switch; off means only staff can see and book the room. Saves straight away. */
export function VisibilitySwitch({
  roomId,
  roomName,
  visibility,
  disabled,
}: {
  roomId: string;
  roomName: string;
  visibility: "everyone" | "staff";
  disabled?: boolean;
}) {
  const [on, setOn] = useState(visibility === "everyone");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink" aria-hidden="true">
          Guests can see and book it
          <span className="block text-xs text-subtle">Off: staff only</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${roomName}: guests can see and book it`}
          aria-describedby={error ? `${roomId}-error` : undefined}
          title={disabled ? "Editor access needed" : undefined}
          disabled={disabled || pending}
          onClick={() => {
            const next = !on;
            setOn(next);
            setError(null);
            start(async () => {
              const result = await setRoomVisibility({ roomId, visibility: next ? "everyone" : "staff" });
              if (!result.ok) {
                setOn(!next);
                setError(result.error);
              }
            });
          }}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            on ? "bg-confirmed" : "bg-line",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
              on && "translate-x-5",
            )}
          />
        </button>
      </div>
      {error && (
        <p id={`${roomId}-error`} className="mt-1 text-xs text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
