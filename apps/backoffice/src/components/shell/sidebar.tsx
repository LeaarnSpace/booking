"use client";
// Sectioned sidebar. It only receives the sections this person can access (filtered on the server).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Globe, LayoutDashboard, LayoutGrid, Users, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import type { SectionConfig } from "@/lib/sections";

const ICONS: Record<SectionConfig["icon"], LucideIcon> = {
  globe: Globe,
  calendar: CalendarDays,
  "layout-grid": LayoutGrid,
  users: Users,
};

export function Sidebar({ sections, onNavigate }: { sections: SectionConfig[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Back office" className="flex h-full flex-col gap-8 bg-ink px-4 py-6 text-white/80">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <Logo size={36} />
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">Learn Space</span>
          <span className="block text-xs text-white/50">Back office</span>
        </span>
      </Link>

      <ul className="flex flex-col gap-1">
        <li>
          <NavLink href="/" active={isActive("/")} icon={LayoutDashboard} onNavigate={onNavigate}>
            Overview
          </NavLink>
        </li>
      </ul>

      {sections.map((section) => {
        const Icon = ICONS[section.icon];
        return (
          <div key={section.id} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/40">{section.label}</p>
            <NavLink href={section.href} active={pathname === section.href} icon={Icon} onNavigate={onNavigate}>
              {section.items.length ? "Overview" : section.label}
            </NavLink>
            {section.items.map((item) => (
              <NavLink key={item.href} href={item.href} active={isActive(item.href)} onNavigate={onNavigate} inset>
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  inset,
  onNavigate,
  children,
}: {
  href: string;
  active: boolean;
  icon?: LucideIcon;
  inset?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        inset && "pl-10",
        active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
      )}
    >
      {Icon && <Icon size={18} strokeWidth={1.75} className={active ? "text-beam-400" : "text-white/50"} />}
      {children}
    </Link>
  );
}
