"use client";
import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

export function CancelForm({
  action,
  reasons,
}: {
  action: (prev: Result | null, form: FormData) => Promise<Result>;
  reasons: string[];
}) {
  const [state, run, pending] = useActionState(action, null);
  const [reason, setReason] = useState("");

  return (
    <form
      className="mx-auto flex max-w-[760px] flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm("Cancel this booking? The slot will be released.")) return;
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <fieldset className="flex flex-col">
        <legend className="mb-6">
          <span className="block text-2xl font-bold text-ink">Why are you cancelling?</span>
          <span className="text-base text-muted">Select a reason for your cancellation</span>
        </legend>
        {reasons.map((r) => (
          <label
            key={r}
            className="flex cursor-pointer items-center justify-between border-b border-line px-5 py-3 text-base text-ink"
          >
            {r}
            <input
              type="radio"
              name="reason"
              value={r}
              required
              onChange={() => setReason(r)}
              className="size-5 accent-green"
            />
          </label>
        ))}
      </fieldset>
      {reason === "Other" && (
        <label className="flex flex-col gap-2 text-base font-medium text-ink">
          Tell us more
          <textarea
            name="other"
            required
            minLength={3}
            maxLength={280}
            rows={4}
            className="rounded-md border border-line bg-sunk p-4 text-base"
          />
        </label>
      )}
      <div className="fixed inset-x-0 bottom-[72px] z-20 border-t border-line bg-white px-4 py-4 md:static md:border-0 md:p-0">
        {state && !state.ok && (
          <p role="alert" className="mb-3 text-sm text-error-ink">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Cancelling…" : "Confirm"}
        </Button>
      </div>
    </form>
  );
}
