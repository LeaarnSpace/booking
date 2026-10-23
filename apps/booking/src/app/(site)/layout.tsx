import { MobileNav } from "@/components/shell/mobile-nav";

// Pages with the app's navigation. Each page renders its own top bar (the landing page lays it over its photo);
// phones also get the bottom bar, so pages leave room for it.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-svh pb-24 md:pb-0">{children}</div>
      <MobileNav />
    </>
  );
}
