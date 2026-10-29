"use client";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { dropMessage, resendMessage, setMessageEnabled } from "./actions";

/** On/off switch for one kind of message. Saves straight away. */
export function MessageSwitch({
  id,
  label,
  enabled,
  disabled,
}: {
  id: string;
  label: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        aria-describedby={error ? `${id}-error` : undefined}
        title={disabled ? "Editor access needed" : undefined}
        disabled={disabled || pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          setError(null);
          start(async () => {
            const result = await setMessageEnabled({ id, enabled: next });
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
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Send again" (queue it and ask the booking app to send) and "Discard" for a failed message */
export function FailedActions({ id, canResend, disabled }: { id: number; canResend: boolean; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: (id: number) => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      const result = await action(id);
      setError(result.ok ? null : result.error);
    });
  const button =
    "rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-sunk disabled:cursor-not-allowed disabled:opacity-60";
  return (
    <span className="flex shrink-0 flex-col items-end">
      <span className="flex gap-2">
        {canResend && (
          <button type="button" disabled={disabled || pending} onClick={() => run(resendMessage)} className={button}>
            Send again
          </button>
        )}
        <button type="button" disabled={disabled || pending} onClick={() => run(dropMessage)} className={button}>
          Discard
        </button>
      </span>
      {error && <span className="mt-1 text-xs text-error-ink">{error}</span>}
    </span>
  );
}
