"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retry } from "../actions";

/** Puts a declined booking back on hold (if the slot is still free) and goes to the payment page */
export function RetryButton({ bookingRef }: { bookingRef: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-1 flex-col gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await retry(bookingRef);
            if (!result.ok) setError(result.error);
          })
        }
      >
        {pending ? "Holding slot…" : "Retry"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
