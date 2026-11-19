"use client";
// Teams for job roles, and news and blog categories: rename, reorder, add, and delete when unused. Each row saves
// on its own. Renaming changes it everywhere it's used.
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { Button } from "@/components/ui/button";
import { deleteCategory, moveCategory, saveCategory } from "@/app/(app)/website/actions";
import { CATEGORY_LABELS, type Category, type CategoryKind } from "@learnspace/website-content/client";

const input = "h-9 min-w-40 flex-1 rounded-md border border-line bg-white px-3 text-sm text-ink disabled:bg-sunk";

export function CategoryEditor({
  kind,
  categories,
  canEdit,
  canDelete,
  usedLabel,
  usedPlural,
}: {
  kind: CategoryKind;
  categories: Category[];
  canEdit: boolean;
  canDelete: boolean;
  /** e.g. "role" → "2 roles" */
  /** What uses it, e.g. "role"; `usedPlural` when adding an s isn't right */
  usedLabel: string;
  usedPlural?: string;
}) {
  const label = CATEGORY_LABELS[kind];
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line-soft">
        {categories.map((c, i) => (
          <Row
            key={`${c.id}-${c.name}`}
            category={c}
            first={i === 0}
            last={i === categories.length - 1}
            canEdit={canEdit}
            canDelete={canDelete}
            usedLabel={usedLabel}
            usedPlural={usedPlural}
          />
        ))}
      </ul>
      {canEdit && (
        <ActionForm action={saveCategory.bind(null, kind, null)} resetOnSuccess className="flex flex-wrap gap-2">
          <input
            name="name"
            required
            maxLength={40}
            placeholder={`New ${label.one}`}
            aria-label={`New ${label.one}`}
            className={input}
          />
          <SubmitButton variant="secondary" pendingLabel="Adding…" className="h-9">
            <Plus size={16} aria-hidden="true" /> Add
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

function Row({
  category: c,
  first,
  last,
  canEdit,
  canDelete,
  usedLabel,
  usedPlural,
}: {
  category: Category;
  first: boolean;
  last: boolean;
  canEdit: boolean;
  canDelete: boolean;
  usedLabel: string;
  usedPlural?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const used = `${c.used} ${c.used === 1 ? usedLabel : (usedPlural ?? `${usedLabel}s`)}`;

  return (
    // Name on its own line (the list sits in a narrow column), then the count and controls under it
    <li className="flex flex-col gap-1.5 py-3">
      {canEdit ? (
        <ActionForm
          action={saveCategory.bind(null, c.kind, c.id)}
          savedLabel="Saved"
          className="flex flex-wrap items-center gap-2"
        >
          <input
            name="name"
            required
            maxLength={40}
            defaultValue={c.name}
            aria-label={`Rename ${c.name}`}
            className={input}
          />
          <SubmitButton variant="secondary" pendingLabel="Saving…" className="h-9">
            Rename
          </SubmitButton>
        </ActionForm>
      ) : (
        <span className="text-sm font-medium text-ink">{c.name}</span>
      )}
      <div className="flex items-center gap-1">
        <span className="flex-1 text-xs text-subtle">{used}</span>
        {canEdit && (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${c.name} up`}
              disabled={first || pending}
              onClick={() => start(() => moveCategory(c.kind, c.id, "up"))}
              className="px-2"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Move ${c.name} down`}
              disabled={last || pending}
              onClick={() => start(() => moveCategory(c.kind, c.id, "down"))}
              className="px-2"
            >
              <ArrowDown size={16} />
            </Button>
          </>
        )}
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            aria-label={`Delete ${c.name}`}
            title={c.used ? `In use: ${used}` : undefined}
            disabled={c.used > 0 || pending}
            onClick={() =>
              confirm(`Delete ${c.name}?`) &&
              start(async () => {
                const result = await deleteCategory(c.kind, c.id);
                setError(result.ok ? null : result.error);
              })
            }
            className="px-2"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error-ink">
          {error}
        </p>
      )}
    </li>
  );
}
