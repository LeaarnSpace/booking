// Live or Draft, as a pair of radio cards at the bottom of the news and blog forms.
import { STATUSES, STATUS_LABELS, type Status } from "@learnspace/website-content/client";

export function StatusField({ defaultValue }: { defaultValue: Status }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {STATUSES.map((s) => (
        <label
          key={s}
          className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-cobalt-600 has-[:checked]:bg-cobalt-50"
        >
          <input
            type="radio"
            name="status"
            value={s}
            defaultChecked={defaultValue === s}
            className="mt-0.5 size-4 accent-cobalt-600"
          />
          <span className="text-sm">
            <span className="block font-semibold text-ink">{STATUS_LABELS[s].label}</span>
            <span className="text-subtle">{STATUS_LABELS[s].hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** The web address field: "learnspace.com.ng/news/" then the editable part */
export function SlugInput({ prefix, defaultValue }: { prefix: string; defaultValue: string }) {
  return (
    <span className="flex h-10 w-full items-center overflow-hidden rounded-md border border-line bg-white text-sm focus-within:ring-2 focus-within:ring-cobalt-200">
      <span className="shrink-0 border-r border-line-soft bg-sunk px-3 leading-10 font-normal text-subtle">
        {prefix}
      </span>
      <input
        name="slug"
        maxLength={80}
        defaultValue={defaultValue}
        placeholder="made-from-the-title"
        className="h-full min-w-0 flex-1 px-3 font-normal text-ink outline-none placeholder:text-subtle"
      />
    </span>
  );
}
