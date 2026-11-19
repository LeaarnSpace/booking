"use client";
// Add or edit a news story. Saving keeps it in the back office; it reaches the website at the next publish, if live.
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { buttonStyles } from "@/components/ui/button";
import { Field, inputStyles as input, Section } from "@/components/website/form-parts";
import { ImageField } from "@/components/website/image-field";
import { MarkdownEditor } from "@/components/website/markdown-editor";
import { RelatedLinks } from "@/components/website/related-links";
import { SlugInput, StatusField } from "@/components/website/status-field";
import { cn } from "@/lib/cn";
import type { Result } from "@/lib/bookings/store";
import type { Category, NewsInput } from "@learnspace/website-content/client";

export function NewsForm({
  story,
  imageUrl,
  categories,
  siteHost,
  action,
  submitLabel,
}: {
  story: NewsInput;
  imageUrl: string | null;
  categories: Category[];
  /** e.g. "learnspace.com.ng" */
  siteHost: string;
  action: (previous: Result | null, form: FormData) => Promise<Result>;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Section title="The story">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Headline" className="sm:col-span-2">
            <input name="title" required maxLength={160} defaultValue={story.title} className={input} />
          </Field>
          <Field label="Category" hint="Add or rename categories on the news page">
            <select name="categoryId" required defaultValue={story.categoryId} className={input}>
              <option value="" disabled>
                Pick a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" hint="Newest stories come first">
            <input name="date" type="date" required defaultValue={story.date} className={input} />
          </Field>
          <Field
            label="Web address"
            hint="Made from the headline if left empty. Changing it later breaks links people have already shared."
            className="sm:col-span-2"
          >
            <SlugInput prefix={`${siteHost}/news/`} defaultValue={story.slug} />
          </Field>
        </div>
        <ImageField
          area="news"
          label="Photo (optional)"
          hint="JPEG, PNG or WebP, at least 1200 pixels wide. Shown beside the headline and on the News page, cropped to fit."
          defaultKey={story.imageKey}
          defaultUrl={imageUrl}
          aspect="495 / 307"
        />
      </Section>

      <Section title="The original story" hint="Where it was first published. The story’s page links there.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Publisher" hint="e.g. Premium Times">
            <input name="source" maxLength={80} defaultValue={story.source ?? ""} className={input} />
          </Field>
          <Field label="Link to the story">
            <input
              name="sourceUrl"
              type="url"
              maxLength={500}
              defaultValue={story.sourceUrl ?? ""}
              placeholder="https://"
              className={input}
            />
          </Field>
          <Field
            label="Summary"
            hint="A line or two in our own words, shown with the headline and in link previews"
            className="sm:col-span-2"
          >
            <textarea
              name="summary"
              rows={3}
              maxLength={400}
              defaultValue={story.summary}
              className={cn(input, "h-auto py-2")}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Our take"
        hint="Optional. Shown as “Why this matters”, and the story gets a “LearnSpace take” badge. Leave empty for none."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Written by">
            <input name="author" maxLength={80} defaultValue={story.author ?? ""} className={input} />
          </Field>
          <Field label="Reviewed by">
            <input name="reviewer" maxLength={80} defaultValue={story.reviewer ?? ""} className={input} />
          </Field>
        </div>
        <MarkdownEditor name="body" label="Why this matters" defaultValue={story.body} rows={10} maxLength={20_000} />
      </Section>

      <Section
        title="Related from LearnSpace"
        hint="Cards under the story pointing to our own podcasts, insights, blog posts or reports."
      >
        <RelatedLinks name="related" defaultValue={story.related} />
      </Section>

      <Section title="On the website">
        <StatusField defaultValue={story.status} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link href="/website/news" className={buttonStyles({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </ActionForm>
  );
}
