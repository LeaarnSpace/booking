"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRole } from "../../actions";

/** Managers only. Hiding is usually enough; deleting removes the role for good. */
export function DeleteRole({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 border-t border-line-soft pt-6">
      <Button
        variant="danger-outline"
        disabled={pending}
        onClick={() =>
          confirm(`Delete ${title} for good? To take it off the website but keep it, hide it instead.`) &&
          start(async () => {
            const result = await deleteRole(id);
            if (!result.ok) setError(result.error);
          })
        }
      >
        <Trash2 size={16} aria-hidden="true" /> {pending ? "Deleting…" : "Delete role"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-error-ink">
          {error}
        </p>
      )}
    </div>
  );
}
