import { Container } from "@/components/shell/page";
import { Logo } from "@/components/ui/logo";

// Shown at once while a page loads its data, so navigation responds straight away. Each page draws its own top
// bar (it needs the signed-in customer), so this one has a placeholder in its place.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <header className="sticky top-0 z-30 w-full bg-sunk md:bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 pb-4 pt-6 md:px-20 md:py-5">
          <Logo />
          <div className="h-[42px] w-32 animate-pulse rounded-full bg-line" />
        </div>
      </header>
      <Container className="flex animate-pulse flex-col gap-6 pt-6 md:pt-14">
        <div className="h-7 w-56 rounded-md bg-line" />
        <div className="grid gap-3 md:grid-cols-2 md:gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="min-h-[201px] bg-line md:min-h-[238px]" />
          ))}
        </div>
      </Container>
    </div>
  );
}
