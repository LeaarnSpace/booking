import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { Viewer } from "@/lib/viewer";
import { DesktopNavLinks } from "./desktop-nav";
import { HeaderBar } from "./header-bar";
import { onPhoto } from "./on-photo";

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
 * links, notifications and sign-in buttons. It stays at the top while the page scrolls; `overlay` lays it over
 * the landing page's photo.
 */
export function AppHeader({ viewer, unread, overlay }: { viewer: Viewer | null; unread: number; overlay?: boolean }) {
  return (
    <HeaderBar overlay={overlay}>
      {/* Three columns on laptops and up, so the links sit in the middle of the page whatever is either side; tablets
          keep a simple row, where a signed-in name wouldn't leave room for equal sides */}
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-4 pb-4 pt-6 lg:grid lg:grid-cols-[1fr_auto_1fr] md:px-20 md:py-5">
        <Link href="/" aria-label="Learn Space home" className="lg:justify-self-start">
          <Logo />
        </Link>
        <DesktopNavLinks />
        <div className="flex items-center gap-3 lg:justify-self-end">
          {viewer ? (
            <>
              <Link
                href="/notifications"
                className="relative hidden md:block"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Icon name="bell-pin" className={onPhoto.icon} />
              </Link>
              <span className={cn("hidden h-6 w-px md:block", onPhoto.divider)} />
              <AccountPill viewer={viewer} />
            </>
          ) : (
            <>
              <ButtonLink
                href="/login"
                variant="ghost"
                size="sm"
                className={cn(
                  onPhoto.primary,
                  // Over the landing photo, until the bar is mostly white
                  "group-data-clear:hover:bg-white/10 group-data-clear:hover:text-white",
                )}
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
    </HeaderBar>
  );
}
