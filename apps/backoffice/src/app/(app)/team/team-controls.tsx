"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ROLES } from "@/lib/sections";
import { addPerson, removePerson, setAccess, type ActionResult } from "./actions";

const selectClass =
  "h-9 rounded-md border border-line bg-white px-2 text-sm text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-cobalt-400";

/** Role dropdown for one person in one section; saves as soon as it changes. The page keys it by
 * the saved role, so it resets whenever the server value changes. */
export function AccessSelect({
  email,
  section,
  sectionLabel,
  role,
}: {
  email: string;
  section: string;
  sectionLabel: string;
  role: string;
}) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <select
        aria-label={`${sectionLabel} role for ${email}`}
        className={cn(selectClass, value === "none" && "text-subtle")}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          setError(null);
          start(async () => {
            const result = await setAccess({ email, section, role: next });
            if (!result.ok) {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
      >
        <option value="none">No access</option>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 max-w-40 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function AddPersonForm({ sections, domain }: { sections: { id: string; label: string }[]; domain: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addPerson, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <Card className="p-5">
      <form ref={form} action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs font-semibold text-subtle">
          Email
          <input
            name="email"
            type="email"
            required
            placeholder={`name@${domain}`}
            className={cn(selectClass, "h-10 px-3")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-subtle">
          Section
          <select name="section" className={cn(selectClass, "h-10")} defaultValue={sections[0]?.id}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-subtle">
          Role
          <select name="role" className={cn(selectClass, "h-10")} defaultValue="viewer">
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          <UserPlus size={16} /> {pending ? "Adding…" : "Give access"}
        </Button>
      </form>
      {state && !state.ok && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-sm text-cobalt-600">Access saved. They can sign in with Google now.</p>}
    </Card>
  );
}

export function RemovePersonButton({ email, name }: { email: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        aria-label={`Remove ${name}`}
        onClick={() => {
          if (!confirm(`Remove all of ${name}'s access and sign them out?`)) return;
          start(async () => {
            const result = await removePerson({ email });
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <X size={16} /> Remove
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
