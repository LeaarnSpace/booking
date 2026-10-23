import type { Metadata } from "next";
import { admin } from "@learnspace/bookings";
import { priceBooking } from "@learnspace/bookings/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { naira } from "@/lib/bookings/format";
import { can } from "@/lib/sections";
import { requireSection } from "@/lib/viewer";
import { AddOnsTable, DiscountsTable, RatesTable } from "./tables";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const viewer = await requireSection("bookings");
  const canEdit = can(viewer.access, "bookings", "editor");
  const prices = await admin.getPriceTables();
  const spaces = prices.spaces.map((s) => ({ id: s.id, name: s.name }));

  // "3 h of Video Podcast: ₦54,000 → ₦51,300", using the space's first service (or its own rate)
  const discounts = prices.discounts.map((d) => {
    const service = prices.services.find((s) => s.spaceId === d.spaceId && s.active);
    const rate = service?.hourlyRate ?? prices.spaces.find((s) => s.id === d.spaceId)?.hourlyRate ?? 0;
    const price = priceBooking({ hourlyRate: rate, hours: d.hours, discounts: [d], addOns: [] });
    return {
      ...d,
      example: `${d.hours} h of ${service?.name ?? d.spaceName}: ${naira(price.base)} → ${naira(price.total)}`,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pricing"
        description="Hourly rates, add-ons and discounts for longer bookings. Changes show in the booking app straight away; bookings already made keep their price."
      />

      <Section
        title="Hourly rates"
        hint="Spaces with services are priced per service. Turn a service off to stop new bookings for it."
      >
        <RatesTable
          spaces={spaces}
          spaceRates={prices.spaces.filter((s) => !s.hasServices)}
          services={prices.services}
          canEdit={canEdit}
        />
      </Section>

      <Section
        title="Add-ons"
        hint="Charged per item for the whole booking. Stock is how many you have; customers can't book more than that."
      >
        <AddOnsTable spaces={spaces} addOns={prices.addOns} canEdit={canEdit} />
      </Section>

      <Section
        title="Length discounts"
        hint="Longer bookings get the biggest discount they reach. Staff bookings are always free."
      >
        <DiscountsTable spaces={spaces} discounts={discounts} canEdit={canEdit} />
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 py-5">
      <div className="px-5">
        <h2 className="text-base font-bold text-ink-strong">{title}</h2>
        <p className="text-sm text-subtle">{hint}</p>
      </div>
      {children}
    </Card>
  );
}
