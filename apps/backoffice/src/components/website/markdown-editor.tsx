"use client";
// Markdown text box with a formatting toolbar and a preview. The toolbar wraps the selected text (or inserts a
// placeholder) so people don't need to know Markdown; the preview shows roughly how it will look on the website.
import { useRef, useState } from "react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { markdownToHtml } from "@/lib/markdown";

type Edit = { before: string; after?: string; placeholder: string; line?: boolean };

const TOOLS: { label: string; icon: LucideIcon; edit: Edit }[] = [
  { label: "Heading", icon: Heading2, edit: { before: "## ", placeholder: "Heading", line: true } },
  { label: "Subheading", icon: Heading3, edit: { before: "### ", placeholder: "Subheading", line: true } },
  { label: "Bold", icon: Bold, edit: { before: "**", after: "**", placeholder: "bold text" } },
  { label: "Italic", icon: Italic, edit: { before: "_", after: "_", placeholder: "italic text" } },
  { label: "Link", icon: Link2, edit: { before: "[", after: "](https://)", placeholder: "link text" } },
  { label: "Bulleted list", icon: List, edit: { before: "- ", placeholder: "Item", line: true } },
  { label: "Numbered list", icon: ListOrdered, edit: { before: "1. ", placeholder: "Item", line: true } },
  { label: "Quote", icon: Quote, edit: { before: "> ", placeholder: "Quote", line: true } },
];

/** Styles for the rendered preview (headings, lists, quotes, links) */
export const proseStyles =
  "text-sm leading-6 text-ink [&_a]:text-cobalt-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-cobalt-400 [&_blockquote]:pl-3 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2:first-child]:mt-0 [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_ol]:mt-2";

export function MarkdownEditor({
  name,
  label,
  defaultValue,
  rows = 16,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows?: number;
  maxLength?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const box = useRef<HTMLTextAreaElement>(null);

  function apply({ before, after = "", placeholder, line }: Edit) {
    const el = box.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || placeholder;
    // Line formats start on their own line
    const lead = line && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const text = line
      ? selected
          .split("\n")
          .map((l) => before + l)
          .join("\n")
      : before + selected + after;
    const next = value.slice(0, start) + lead + text + value.slice(end);
    setValue(next);
    // Select the inserted text (without the markers) so typing replaces the placeholder
    const from = start + lead.length + before.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, from + (line ? text.length - before.length : selected.length));
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${name}-label`} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <div className="overflow-hidden rounded-md border border-line focus-within:border-cobalt-400">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunk px-2 py-1">
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap">
            {TOOLS.map(({ label: l, icon: Icon, edit }) => (
              <button
                key={l}
                type="button"
                title={l}
                aria-label={l}
                disabled={tab === "preview"}
                onClick={() => apply(edit)}
                className="rounded p-1.5 text-subtle hover:bg-white hover:text-ink disabled:opacity-40"
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <div role="tablist" className="flex gap-1 text-xs font-semibold">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded px-2.5 py-1 capitalize",
                  tab === t ? "bg-white text-ink shadow-sm" : "text-subtle hover:text-ink",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* The text box stays in the form while previewing, so its value is always sent */}
        <textarea
          ref={box}
          name={name}
          aria-labelledby={`${name}-label`}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            "block w-full resize-y bg-white p-3 font-mono text-sm text-ink outline-none",
            tab === "preview" && "hidden",
          )}
        />
        {tab === "preview" && (
          <div
            className={cn("min-h-40 bg-white p-4", proseStyles)}
            // Rendered by lib/markdown, which escapes HTML and keeps only web and email links
            dangerouslySetInnerHTML={{
              __html: value.trim() ? markdownToHtml(value) : "<p>Nothing written yet.</p>",
            }}
          />
        )}
      </div>
      <span className="text-xs text-subtle">
        Use the toolbar, or Markdown: ## for a heading, ### for a subheading, - for a bullet, **bold**,
        [text](https://link).
      </span>
    </div>
  );
}
