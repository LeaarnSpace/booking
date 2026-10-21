// The back office is one app split into sections. Each person has a role per section; the sidebar,
// pages and actions all check it. Add a section here (and to `sectionEnum` in @learnspace/auth-staff).
import type { Access, Role, Section } from "@learnspace/auth-staff";

export type { Access, Role, Section };

export interface NavItem {
  label: string;
  href: string;
}

export interface SectionConfig {
  id: Section;
  label: string;
  description: string;
  /** lucide icon name, resolved in the sidebar */
  icon: "globe" | "calendar" | "layout-grid" | "users";
  href: string;
  items: NavItem[];
}

export const SECTIONS: SectionConfig[] = [
  {
    id: "website",
    label: "Website",
    description: "Job roles, news and blog posts on learnspace.com.ng",
    icon: "globe",
    href: "/website",
    items: [
      { label: "Roles", href: "/website/roles" },
      { label: "News", href: "/website/news" },
      { label: "Blog", href: "/website/blog" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    description: "Bookings, schedules and refunds from the booking platform",
    icon: "calendar",
    href: "/bookings",
    items: [],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Key numbers and links for the projects we run",
    icon: "layout-grid",
    href: "/projects",
    items: [],
  },
  {
    id: "team",
    label: "Team & access",
    description: "Who can use the back office, and what they can do",
    icon: "users",
    href: "/team",
    items: [],
  },
];

export const sectionById = (id: Section) => SECTIONS.find((s) => s.id === id)!;

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "viewer", label: "Viewer", description: "Can see everything in the section" },
  { id: "editor", label: "Editor", description: "Can add and change things" },
  { id: "manager", label: "Manager", description: "Full control, including deleting" },
];

const RANK: Record<Role, number> = { viewer: 1, editor: 2, manager: 3 };

/** True when `access` gives at least `min` in `section` */
export function can(access: Access, section: Section, min: Role = "viewer") {
  const role = access[section];
  return role !== undefined && RANK[role] >= RANK[min];
}
