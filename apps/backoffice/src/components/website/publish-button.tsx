"use client";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publish } from "@/app/(app)/website/actions";

export function PublishButton({ highlight }: { highlight: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button
        variant={highlight ? "primary" : "secondary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await publish();
            setMessage(
              result.ok
                ? { ok: true, text: "Publishing: the website updates in about a minute." }
                : { ok: false, text: result.error },
            );
          })
        }
      >
        <Send size={16} aria-hidden="true" /> {pending ? "Publishing…" : "Publish to website"}
      </Button>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "text-xs text-confirmed-ink" : "text-xs text-error-ink"}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
