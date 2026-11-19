"use client";
// Add or edit a blog post. Saving keeps it in the back office; it reaches the website at the next publish, if live.
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { buttonStyles } from "@/components/ui/button";
import { Field, inputStyles as input, Section } from "@/components/website/form-parts";
import { ImageField } from "@/components/website/image-field";
import { MarkdownEditor } from "@/components/website/markdown-editor";
import { SlugInput, StatusField } from "@/components/website/status-field";
import { cn } from "@/lib/cn";
import type { Result } from "@/lib/bookings/store";
import type { Category, PostInput } from "@learnspace/website-content/client";

export function PostForm({
  post,
  imageUrl,
  categories,
  siteHost,
  action,
  submitLabel,
}: {
  post: PostInput;
  imageUrl: string | null;
  categories: Category[];
  /** e.g. "learnspace.com.ng" */
  siteHost: string;
  action: (previous: Result | null, form: FormData) => Promise<Result>;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <Section title="The post">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <input name="title" required maxLength={160} defaultValue={post.title} className={input} />
          </Field>
          <Field label="Excerpt" hint="A line or two on the cards and in link previews" className="sm:col-span-2">
            <textarea
              name="excerpt"
              rows={2}
              required
              maxLength={300}
              defaultValue={post.excerpt}
              className={cn(input, "h-auto py-2")}
            />
          </Field>
          <Field label="Category" hint="Optional. Add or rename categories on the blog page.">
            <select name="categoryId" defaultValue={post.categoryId ?? ""} className={input}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" hint="Optional, shown on the post">
            <input name="date" type="date" defaultValue={post.date ?? ""} className={input} />
          </Field>
          <Field label="Length" hint="Only for videos and podcasts, e.g. 1h 20m. Cards then show a play icon.">
            <input name="duration" maxLength={20} defaultValue={post.duration ?? ""} className={input} />
          </Field>
          <Field
            label="Web address"
            hint="Made from the title if left empty. Changing it later breaks links people have already shared."
            className="sm:col-span-2"
          >
            <SlugInput prefix={`${siteHost}/blog/`} defaultValue={post.slug} />
          </Field>
        </div>
        <ImageField
          area="blog"
          label="Photo"
          hint="JPEG, PNG or WebP, at least 1200 pixels wide. Shown across the top of the post and on its card, cropped to fit."
          defaultKey={post.imageKey}
          defaultUrl={imageUrl}
          aspect="1312 / 502"
        />
      </Section>

      <Section title="The post’s text">
        <MarkdownEditor name="body" label="Text" defaultValue={post.body} maxLength={50_000} />
      </Section>

      <Section title="On the website" hint="Live posts need a photo.">
        <StatusField defaultValue={post.status} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link href="/website/blog" className={buttonStyles({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </ActionForm>
  );
}
