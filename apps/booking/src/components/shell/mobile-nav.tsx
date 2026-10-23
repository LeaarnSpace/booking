"use client";
/* eslint-disable @next/next/no-img-element -- the active marker is the design's own SVG */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { isActive, MOBILE_NAV } from "./nav";

/** Phone bottom bar: Home, Schedule, Support, Profile. The current tab gets the filled icon and a bar on top. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex items-start justify-between bg-sunk px-12 pb-[max(16px,env(safe-area-inset-bottom))] pt-0.5 md:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 text-sm text-muted"
          >
            <span className="flex h-0.5 w-[38px] items-center">
              {active && <img alt="" src="/icons/nav-active-line.svg" className="block h-0.5 w-[38px]" />}
            </span>
            <Icon name={active ? item.activeIcon : item.icon} />
            <span className={active ? "font-semibold text-ink" : undefined}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
