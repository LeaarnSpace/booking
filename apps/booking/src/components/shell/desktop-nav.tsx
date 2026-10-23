"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { DESKTOP_NAV, isActive } from "./nav";

export function DesktopNavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
      {DESKTOP_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-base font-medium tracking-[0.014em] text-subtle hover:text-ink",
              active && "text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
