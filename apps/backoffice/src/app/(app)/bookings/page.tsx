import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { requireSection } from "@/lib/viewer";

export const metadata: Metadata = { title: "Bookings" };

export default async function Page() {
  await requireSection("bookings");
  return (
    <ComingSoon title="Bookings" description="Bookings, schedules and refunds.">
      This section will connect to the booking platform once it is built from its Figma design.
    </ComingSoon>
  );
}
