import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Width and side padding shared by every page */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 md:px-20", className)}>{children}</div>;
}

/** The round back button from the design */
export function BackButton({ href, label = "Back", className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-white drop-shadow-[0_1px_1px_rgba(14,22,80,0.06)] hover:bg-sunk",
        className,
      )}
    >
      <Icon name="arrow-left" />
    </Link>
  );
}

/** Back button and page title, on the grey band under the top bar (as in the design's inner pages) */
export function PageTitle({ title, back, children }: { title: string; back: string; children?: React.ReactNode }) {
  return (
    <div className="bg-sunk md:bg-white">
      <Container className="flex items-center justify-between gap-4 pb-5 pt-2 md:pt-8">
        <div className="flex items-center gap-2">
          <BackButton href={back} />
          <h1 className="text-xl font-bold tracking-[0.012em] text-ink">{title}</h1>
        </div>
        {children}
      </Container>
    </div>
  );
}
