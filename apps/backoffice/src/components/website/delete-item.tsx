"use client";
// Managers only: deletes a story or post for good. Setting it to Draft is usually enough.
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Result } from "@learnspace/website-content/client";

export function DeleteItem({
  id,
  title,
  noun,
  remove,
}: {
  id: string;
  title: string;
  /** "story", "post" */
  noun: string;
  remove: (id: string) => Promise<Result>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 border-t border-line-soft pt-6">
      <Button
        variant="danger-outline"
        disabled={pending}
        onClick={() =>
          confirm(`Delete “${title}” for good? To take it off the website but keep it, set it to Draft instead.`) &&
          start(async () => {
            const result = await remove(id);
            if (!result.ok) setError(result.error);
          })
        }
      >
        <Trash2 size={16} aria-hidden="true" /> {pending ? "Deleting…" : `Delete ${noun}`}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
