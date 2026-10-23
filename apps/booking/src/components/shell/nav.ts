import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  /** Other paths that count as this tab */
  matches: string[];
}

/** Phone bottom bar, as in the design */
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home-light", activeIcon: "home-fill", matches: ["/spaces"] },
  {
    href: "/schedule",
    label: "Schedule",
    icon: "calendar-light",
    activeIcon: "calendar-fill",
    matches: ["/book", "/bookings", "/notifications"],
  },
  { href: "/support", label: "Support", icon: "question-light", activeIcon: "question-fill", matches: [] },
  { href: "/profile", label: "Profile", icon: "user-circle-light", activeIcon: "user-circle-fill", matches: [] },
];

/** Desktop header links */
export const DESKTOP_NAV = [
  { href: "/schedule", label: "Schedule", matches: ["/book"] },
  { href: "/bookings", label: "Bookings", matches: [] },
  { href: "/support", label: "Support", matches: [] },
];

export const isActive = (pathname: string, item: { href: string; matches: string[] }) =>
  item.href === "/"
    ? pathname === "/" || item.matches.some((m) => pathname.startsWith(m))
    : [item.href, ...item.matches].some((m) => pathname === m || pathname.startsWith(`${m}/`));
