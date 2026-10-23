import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { requireViewer, safeNext } from "@/lib/viewer";

export const metadata: Metadata = { title: "All set" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const viewer = await requireViewer("/welcome");
  return (
    <div className="flex w-full max-w-[398px] flex-col items-center gap-4 rounded-md border border-line bg-white p-8 text-center md:max-w-[480px]">
      <StatusMark tone="success" />
      <h1 className="text-2xl font-bold text-blue-700">All set!</h1>
      <p className="text-base text-subtle">
        Welcome, {viewer.name.split(" ")[0] || "there"}. Your account is ready
        {viewer.isStaff ? ", and as a staff member your bookings are free and confirmed straight away." : "."}
      </p>
      <ButtonLink href={next === "/" ? "/schedule" : next} className="mt-2 w-full">
        {next === "/" ? "Book a space" : "Continue"}
      </ButtonLink>
    </div>
  );
}
