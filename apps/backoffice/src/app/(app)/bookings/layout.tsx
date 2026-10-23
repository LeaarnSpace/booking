import { requireSection } from "@/lib/viewer";

export default async function BookingsLayout({ children }: { children: React.ReactNode }) {
  await requireSection("bookings");
  return <div className="flex flex-col gap-6">{children}</div>;
}
