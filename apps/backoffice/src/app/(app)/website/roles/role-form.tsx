"use client";
// Add or edit a job role and its job description. Saving keeps it in the back office; it reaches the website at
// the next publish.
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { buttonStyles } from "@/components/ui/button";
import { Field, inputStyles as input, Section } from "@/components/website/form-parts";
import { MarkdownEditor } from "@/components/website/markdown-editor";
import { cn } from "@/lib/cn";
import type { Result } from "@/lib/bookings/store";
import {
  ARRANGEMENTS,
  EMPLOYMENT_TYPES,
  VISIBILITIES,
  VISIBILITY_LABELS,
  type Category,
  type RoleInput,
} from "@learnspace/website-content/client";

export function RoleForm({
  role,
  teams,
  action,
  submitLabel,
}: {
  role: RoleInput;
  teams: Category[];
  action: (previous: Result | null, form: FormData) => Promise<Result>;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Section title="The role">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <input name="title" required maxLength={80} defaultValue={role.title} className={input} />
          </Field>
          <Field label="Team" hint="Add or rename teams on the roles page">
            <select name="teamId" required defaultValue={role.teamId} className={input}>
              <option value="" disabled>
                Pick a team
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select name="employmentType" required defaultValue={role.employmentType} className={input}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input
              name="location"
              required
              maxLength={60}
              defaultValue={role.location}
              placeholder="Lagos"
              className={input}
            />
          </Field>
          <Field label="Arrangement">
            <select name="arrangement" required defaultValue={role.arrangement} className={input}>
              {ARRANGEMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Posted on">
            <input name="posted" type="date" required defaultValue={role.posted} className={input} />
          </Field>
          <Field label="Closes on" hint="Optional. It leaves the website at the first publish after this date.">
            <input name="closesOn" type="date" defaultValue={role.closesOn ?? ""} className={input} />
          </Field>
          <Field label="Reports to" hint="Optional, e.g. Head of Research. Shown in the role summary.">
            <input name="reportsTo" maxLength={80} defaultValue={role.reportsTo ?? ""} className={input} />
          </Field>
          <Field label="Salary" hint="Optional, e.g. ₦400k–₦600k a month. Left off the page when empty.">
            <input name="salary" maxLength={80} defaultValue={role.salary ?? ""} className={input} />
          </Field>
        </div>
      </Section>

      <Section
        title="Job description"
        hint="Each heading in the description starts a section on the job page (About the role, What you will do…). Use a subheading for small labels like Nice to have."
      >
        <Field
          label="Summary"
          hint="The intro under the title on the job page, and the preview when the link is shared"
        >
          <textarea
            name="summary"
            rows={2}
            maxLength={300}
            defaultValue={role.summary}
            className={cn(input, "h-auto py-2")}
          />
        </Field>
        <MarkdownEditor name="description" label="Description" defaultValue={role.description} maxLength={20_000} />
      </Section>

      <Section
        title="How to apply"
        hint="The job page’s Apply button uses the link if there is one, otherwise the email."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Application link" hint="e.g. a Google Form">
            <input
              name="applyUrl"
              type="url"
              maxLength={500}
              defaultValue={role.applyUrl ?? ""}
              placeholder="https://"
              className={input}
            />
          </Field>
          <Field label="Or an email address" hint="Applicants email their CV here">
            <input
              name="applyEmail"
              type="email"
              maxLength={120}
              defaultValue={role.applyEmail ?? ""}
              placeholder="careers@learnspace.com.ng"
              className={input}
            />
          </Field>
        </div>
      </Section>

      <Section title="On the website">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VISIBILITIES.map((v) => (
            <label
              key={v}
              className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-cobalt-600 has-[:checked]:bg-cobalt-50"
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                defaultChecked={role.visibility === v}
                className="mt-0.5 size-4 accent-cobalt-600"
              />
              <span className="text-sm">
                <span className="block font-semibold text-ink">{VISIBILITY_LABELS[v].label}</span>
                <span className="text-subtle">{VISIBILITY_LABELS[v].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link href="/website/roles" className={buttonStyles({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </ActionForm>
  );
}
