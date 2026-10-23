import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { admin } from "@learnspace/bookings";
import { ActionForm, SubmitButton } from "@/components/bookings/action-form";
import { FaqEditor } from "@/components/bookings/faq-editor";
import { IncludedEditor } from "@/components/bookings/included-editor";
import { Card } from "@/components/ui/card";
import { naira } from "@/lib/bookings/format";
import { mediaStorage, viewUrl } from "@/lib/storage";
import { requireSection } from "@/lib/viewer";
import { saveServiceDetails } from "../../../actions";
import { PhotoManager } from "../../../photo-manager";

type Props = { params: Promise<{ id: string; serviceId: string }>; searchParams: Promise<{ done?: string }> };

const input = "h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await admin.getServiceRecord((await params).serviceId);
  return { title: service ? `Edit ${service.name}` : "Service" };
}

export default async function EditServicePage({ params, searchParams }: Props) {
  await requireSection("bookings", "editor");
  const [{ id, serviceId }, { done }] = await Promise.all([params, searchParams]);
  const [service, suggestions, storage] = await Promise.all([
    admin.getServiceRecord(serviceId),
    admin.listIncludedItems(),
    mediaStorage(),
  ]);
  if (!service || service.spaceId !== id) notFound();
  const photos = await Promise.all(
    service.photos.map(async (p) => ({ key: p.key, alt: p.alt, url: await viewUrl(storage, p.key) })),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href={`/bookings/rooms/${id}`}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft size={16} /> {service.spaceName}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-strong">{service.name}</h1>
        <p className="mt-1 text-sm text-subtle">
          {naira(service.hourlyRate)} per hour{!service.active && " · not on sale"}. Change the rate on the{" "}
          <Link href="/bookings/pricing" className="font-semibold text-cobalt-600 hover:underline">
            Pricing
          </Link>{" "}
          page.
        </p>
      </div>

      {done === "saved" && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-cobalt-50 px-4 py-3 text-sm text-cobalt-700">
          <CheckCircle2 size={18} aria-hidden="true" /> Changes saved.
        </p>
      )}

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-ink-strong">Photos</h2>
          <p className="text-sm text-subtle">Without photos, the service shows the room&apos;s photos.</p>
        </div>
        <PhotoManager
          owner={{ kind: "service", id: service.id }}
          roomName={service.name}
          photos={photos}
          max={admin.MAX_PHOTOS}
          canEdit
        />
      </Card>

      <ActionForm
        key={JSON.stringify([service.name, service.description, service.included, service.faqs])}
        action={saveServiceDetails.bind(null, id, service.id)}
        className="flex flex-col gap-6"
      >
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink-strong">Details</h2>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Name
            <input name="name" required maxLength={60} defaultValue={service.name} className={input} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={service.description}
              className={`${input} h-auto py-2`}
            />
            <span className="text-xs font-normal text-subtle">Shown on the service card and its page</span>
          </label>
        </Card>
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-ink-strong">What’s included</h2>
            <p className="text-sm text-subtle">
              Free with this service. Anything you charge for is an add-on, set on the Pricing page.
            </p>
          </div>
          <IncludedEditor initial={service.included} suggestions={suggestions} />
        </Card>
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-ink-strong">Common questions</h2>
            <p className="text-sm text-subtle">Shown on the service&apos;s page in the booking app.</p>
          </div>
          <FaqEditor initial={service.faqs} />
        </Card>
        <SubmitButton size="lg" className="self-start" pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
