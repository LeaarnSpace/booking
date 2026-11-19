"use client";
// The cards under "Related from LearnSpace" on a news story: up to MAX_RELATED, each with a type, title, link label
// and link. Sent with the form as JSON in a hidden input; the server checks each card.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputStyles } from "@/components/website/form-parts";
import { MAX_RELATED, RELATED_TYPES, type RelatedLink } from "@learnspace/website-content/client";

const blank = (): RelatedLink => ({ type: "Insights", title: "", linkLabel: "Read more", href: "" });

export function RelatedLinks({ name, defaultValue }: { name: string; defaultValue: RelatedLink[] }) {
  // Keys stay with their card when cards move or are removed
  const [cards, setCards] = useState(() => defaultValue.map((c) => ({ ...c, key: crypto.randomUUID() })));
  const update = (i: number, change: Partial<RelatedLink>) =>
    setCards((all) => all.map((c, j) => (j === i ? { ...c, ...change } : c)));
  const swap = (i: number, j: number) =>
    setCards((all) => {
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(cards.map(({ key: _, ...c }) => c))} />
      {cards.length === 0 && <p className="text-sm text-subtle">No related cards. The section is left off the page.</p>}
      {cards.map((c, i) => (
        <fieldset key={c.key} className="flex flex-col gap-3 rounded-md border border-line-soft p-4">
          <legend className="sr-only">Related card {i + 1}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Type
              <select
                value={c.type}
                onChange={(e) => update(i, { type: e.target.value as RelatedLink["type"] })}
                className={inputStyles}
              >
                {RELATED_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Title
              <input
                value={c.title}
                maxLength={120}
                onChange={(e) => update(i, { title: e.target.value })}
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Link label
              <input
                value={c.linkLabel}
                maxLength={40}
                placeholder="Read more"
                onChange={(e) => update(i, { linkLabel: e.target.value })}
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Link
              <input
                value={c.href}
                maxLength={500}
                placeholder="/blog/… or https://"
                onChange={(e) => update(i, { href: e.target.value })}
                className={inputStyles}
              />
            </label>
          </div>
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Move card up"
              disabled={i === 0}
              onClick={() => swap(i, i - 1)}
              className="px-2"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Move card down"
              disabled={i === cards.length - 1}
              onClick={() => swap(i, i + 1)}
              className="px-2"
            >
              <ArrowDown size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error-ink"
              onClick={() => setCards((all) => all.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} aria-hidden="true" /> Remove
            </Button>
          </div>
        </fieldset>
      ))}
      {cards.length < MAX_RELATED && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setCards((all) => [...all, { ...blank(), key: crypto.randomUUID() }])}
        >
          <Plus size={14} aria-hidden="true" /> Add a related card
        </Button>
      )}
    </div>
  );
}
