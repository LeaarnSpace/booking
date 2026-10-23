"use client";
// Common questions for a space or service, shown on its page in the booking app. Sent with the form as JSON.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Faq = { question: string; answer: string };

const field = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-subtle";

export function FaqEditor({ initial, name = "faqs" }: { initial: Faq[]; name?: string }) {
  const [faqs, setFaqs] = useState(initial);
  const set = (i: number, change: Partial<Faq>) => setFaqs(faqs.map((f, j) => (j === i ? { ...f, ...change } : f)));
  const move = (i: number, by: number) => {
    const next = [...faqs];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setFaqs(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(faqs)} />
      {faqs.length === 0 && <p className="text-sm text-subtle">No questions yet.</p>}
      <ol className="flex flex-col gap-3">
        {faqs.map((f, i) => (
          <li key={i} className="flex gap-2 rounded-md border border-line-soft bg-sunk p-3">
            <div className="flex flex-1 flex-col gap-2">
              <input
                aria-label={`Question ${i + 1}`}
                value={f.question}
                maxLength={160}
                placeholder="Question, e.g. Is a sound engineer included?"
                onChange={(e) => set(i, { question: e.target.value })}
                className={field}
              />
              <textarea
                aria-label={`Answer ${i + 1}`}
                value={f.answer}
                maxLength={600}
                rows={2}
                placeholder="Answer"
                onChange={(e) => set(i, { answer: e.target.value })}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Move down"
                disabled={i === faqs.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={14} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove question ${i + 1}`}
                className="text-error-ink"
                onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        disabled={faqs.length >= 12}
        onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
      >
        <Plus size={16} /> Add question
      </Button>
    </div>
  );
}
