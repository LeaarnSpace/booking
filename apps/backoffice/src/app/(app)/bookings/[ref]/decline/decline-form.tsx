"use client";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { DECLINE_REASONS } from "@/lib/bookings/types";
import type { Result } from "@/lib/bookings/store";

export function DeclineForm({
  action,
  firstName,
}: {
  action: (previous: Result | null, form: FormData) => Promise<Result>;
  firstName: string;
}) {
  const [reason, setReason] = useState<string>("");
  const other = reason === "other";

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Reason</legend>
        <div className="divide-y divide-line-soft rounded-lg border border-line-soft bg-white">
          {DECLINE_REASONS.map((r) => (
            <label
              key={r.id}
              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-sm text-ink"
            >
              {r.label}
              <input
                type="radio"
                name="reason"
                value={r.id}
                required
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="size-4 accent-cobalt-600"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        <span>
          Message to {firstName} {!other && <span className="font-normal text-subtle">(optional)</span>}
        </span>
        <textarea
          name="note"
          rows={4}
          maxLength={1000}
          required={other}
          placeholder={other ? "Explain why the booking is declined" : "Anything that helps them fix it"}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink placeholder:text-subtle"
        />
        <span className="text-xs font-normal text-subtle">Sent with the decline email.</span>
      </label>

      <SubmitButton size="lg" pendingLabel="Declining…">
        Decline and notify {firstName}
      </SubmitButton>
    </ActionForm>
  );
}
