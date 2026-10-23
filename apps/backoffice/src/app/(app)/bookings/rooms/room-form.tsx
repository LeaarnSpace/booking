"use client";
// Add or edit a room. Lists (opening hours, closed dates, what's included) are kept in state and sent as JSON.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { FaqEditor } from "@/components/bookings/faq-editor";
import { IncludedEditor } from "@/components/bookings/included-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatIsoDate } from "@/lib/bookings/format";
import type { Result, RoomInput } from "@/lib/bookings/store";
import { WEEKDAYS, type ClosedDate, type DayHours } from "@/lib/bookings/types";

const input =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-subtle disabled:bg-sunk";

export function RoomForm({
  room,
  action,
  submitLabel,
  isNew,
  suggestions,
}: {
  room: RoomInput;
  /** Items already used on other spaces and services */
  suggestions: string[];
  isNew?: boolean;
  action: (previous: Result | null, form: FormData) => Promise<Result>;
  submitLabel: string;
}) {
  const [hours, setHours] = useState<DayHours[]>(room.hours);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>(room.closedDates);

  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {isNew && <input type="hidden" name="isNew" value="1" />}
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <input type="hidden" name="closedDates" value={JSON.stringify(closedDates)} />

      <Section title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <input name="name" required maxLength={60} defaultValue={room.name} className={input} />
          </Field>
          <Field label="Card text" hint="One line under the name on the booking app's cards" className="sm:col-span-2">
            <input name="tagline" maxLength={160} defaultValue={room.tagline} className={input} />
          </Field>
          <Field label="Description" hint="Shown to guests in the booking app" className="sm:col-span-2">
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={room.description}
              className={cn(input, "h-auto py-2")}
            />
          </Field>
          <Field label="Hourly rate (₦)">
            <input
              name="hourlyRate"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              required
              defaultValue={room.hourlyRate}
              className={input}
            />
          </Field>
          <Field label="Capacity (people)">
            <input
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              required
              defaultValue={room.capacity}
              className={input}
            />
          </Field>
        </div>
      </Section>

      <Section title="Who can book it">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["everyone", "Everyone", "Guests and staff can see and book it"],
              ["staff", "Staff only", "Hidden from guests in the booking app"],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-cobalt-600 has-[:checked]:bg-cobalt-50"
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                defaultChecked={room.visibility === value}
                className="mt-0.5 size-4 accent-cobalt-600"
              />
              <span className="text-sm">
                <span className="block font-semibold text-ink">{label}</span>
                <span className="text-subtle">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Opening hours" hint="Lagos time. Guests can only book inside these hours.">
        <ul className="flex flex-col divide-y divide-line-soft">
          {WEEKDAYS.map((day, i) => {
            const h = hours[i];
            const set = (next: DayHours) => setHours(hours.map((old, j) => (j === i ? next : old)));
            return (
              <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <label className="flex w-28 items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={h !== null}
                    onChange={(e) => set(e.target.checked ? { open: "09:00", close: "17:00" } : null)}
                    className="size-4 accent-cobalt-600"
                  />
                  {day}
                </label>
                {h ? (
                  <span className="flex items-center gap-2 text-sm text-subtle">
                    <input
                      type="time"
                      aria-label={`${day} opens`}
                      value={h.open}
                      step={1800}
                      onChange={(e) => set({ ...h, open: e.target.value })}
                      className={cn(input, "w-32")}
                    />
                    to
                    <input
                      type="time"
                      aria-label={`${day} closes`}
                      value={h.close}
                      step={1800}
                      onChange={(e) => set({ ...h, close: e.target.value })}
                      className={cn(input, "w-32")}
                    />
                  </span>
                ) : (
                  <span className="text-sm text-subtle">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Closed dates">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="closedOnPublicHolidays"
            defaultChecked={room.closedOnPublicHolidays}
            className="size-4 accent-cobalt-600"
          />
          Closed on Nigerian public holidays
        </label>
        {closedDates.length > 0 && (
          <ul className="flex flex-col gap-2">
            {closedDates.map((d, i) => (
              <li key={`${d.date}-${i}`} className="flex items-center gap-3 rounded-md bg-sunk px-3 py-2 text-sm">
                <span className="font-medium text-ink">{formatIsoDate(d.date)}</span>
                <span className="flex-1 text-subtle">{d.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${formatIsoDate(d.date)}`}
                  onClick={() => setClosedDates(closedDates.filter((_, j) => j !== i))}
                  className="rounded p-1 text-subtle hover:bg-white hover:text-ink"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddClosedDate
          onAdd={(d) => setClosedDates([...closedDates, d].sort((a, b) => a.date.localeCompare(b.date)))}
        />
      </Section>

      <Section
        title="What’s included"
        hint="Free with the space. Anything you charge for is an add-on, set on the Pricing page."
      >
        <IncludedEditor initial={room.included} suggestions={suggestions} />
      </Section>

      <Section title="Common questions" hint="Shown on the space's page in the booking app.">
        <FaqEditor initial={room.faqs} />
      </Section>

      <SubmitButton size="lg" className="self-start" pendingLabel="Saving…">
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-ink-strong">{title}</h2>
        {hint && <p className="text-sm text-subtle">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-semibold text-ink", className)}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-subtle">{hint}</span>}
    </label>
  );
}

// This sits inside the room form, so they use buttons (not nested forms) and read their own inputs

function AddClosedDate({ onAdd }: { onAdd: (d: ClosedDate) => void }) {
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold text-subtle">
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(input, "w-44")} />
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-semibold text-subtle">
        Reason (optional)
        <input
          value={label}
          maxLength={60}
          placeholder="e.g. Maintenance"
          onChange={(e) => setLabel(e.target.value)}
          className={input}
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        disabled={!date}
        onClick={() => {
          onAdd({ date, label: label.trim() });
          setDate("");
          setLabel("");
        }}
      >
        <Plus size={16} /> Add date
      </Button>
    </div>
  );
}
