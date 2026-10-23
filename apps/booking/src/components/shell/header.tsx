import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { Viewer } from "@/lib/viewer";
import { DesktopNavLinks } from "./desktop-nav";

/** Initials and name, linking to the profile */
export function AccountPill({ viewer, className }: { viewer: Viewer; className?: string }) {
  return (
    <Link
      href="/profile"
      className={cn(
        "flex items-center gap-2 rounded-full bg-sunk/50 p-2 pr-3 backdrop-blur-[5px] hover:bg-sunk",
        className,
      )}
    >
      <span className="flex size-[26px] items-center justify-center rounded-full bg-primary text-sm font-bold tracking-[0.014em] text-white">
        {initials(viewer.name)}
      </span>
      <span className="max-w-40 truncate text-base font-medium tracking-[0.014em] text-ink-strong">{viewer.name}</span>
    </Link>
  );
}

/**
 * Top bar. Phones get the logo and account pill (navigation is in the bottom bar); wider screens add the
 * links, notifications and sign-in buttons. `overlay` lays it over the landing page's photo.
 */
export function AppHeader({ viewer, unread, overlay }: { viewer: Viewer | null; unread: number; overlay?: boolean }) {
  return (
    <header
      className={cn(
        "z-20 w-full",
        overlay ? "absolute inset-x-0 top-0 md:bg-white" : "bg-sunk backdrop-blur-[5px] md:bg-white",
      )}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 pb-4 pt-6 md:px-20 md:py-5">
        <Link href="/" aria-label="Learn Space home">
          <Logo />
        </Link>
        <DesktopNavLinks />
        <div className="flex items-center gap-3">
          {viewer ? (
            <>
              <Link
                href="/notifications"
                className="relative hidden md:block"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Icon name="bell-pin" />
              </Link>
              <span className="hidden h-6 w-px bg-line md:block" />
              <AccountPill viewer={viewer} />
            </>
          ) : (
            <>
              <ButtonLink
                href="/login"
                variant="ghost"
                size="sm"
                className={cn("text-primary", overlay && "max-md:text-white max-md:hover:bg-white/10")}
              >
                Login
              </ButtonLink>
              <ButtonLink href="/sign-up" size="sm">
                Sign Up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
