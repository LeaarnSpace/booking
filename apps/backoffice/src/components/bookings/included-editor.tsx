"use client";
// "What's included" for a space or service: free items customers get with it. Items come from one shared list,
// so typing suggests what's already used elsewhere. The chosen names are sent with the form as JSON.
import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const input =
  "h-10 w-full max-w-xs rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-subtle";

export function IncludedEditor({
  name = "included",
  initial,
  suggestions,
}: {
  /** Form field the JSON list is sent as */
  name?: string;
  initial: string[];
  suggestions: string[];
}) {
  const [items, setItems] = useState(initial);
  const [value, setValue] = useState("");
  const listId = useId();
  const add = () => {
    const item = value.trim();
    if (item && !items.some((i) => i.toLowerCase() === item.toLowerCase())) setItems([...items, item]);
    setValue("");
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1 rounded-full bg-sunk py-1 pl-3 pr-1 text-sm text-ink">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => setItems(items.filter((x) => x !== item))}
                className="rounded-full p-0.5 text-subtle hover:bg-white hover:text-ink"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-subtle">Nothing listed yet.</p>
      )}
      <div className="flex gap-2">
        <input
          value={value}
          maxLength={40}
          list={listId}
          aria-label="Add an included item"
          placeholder="e.g. Boom arm"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={input}
        />
        <datalist id={listId}>
          {suggestions
            .filter((s) => !items.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
        <Button type="button" variant="secondary" disabled={!value.trim()} onClick={add}>
          <Plus size={16} /> Add
        </Button>
      </div>
    </div>
  );
}
