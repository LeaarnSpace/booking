"use client";
// Layout for every signed-in page: sidebar on the left (a slide-out drawer on small screens) and a
// top bar with the account menu.
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import type { SectionConfig } from "@/lib/sections";

export function AppShell({
  sections,
  user,
  children,
}: {
  sections: SectionConfig[];
  user: { name: string; email: string; image: string | null };
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto lg:block">
        <Sidebar sections={sections} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto">
            <Sidebar sections={sections} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line-soft bg-white/85 px-4 backdrop-blur sm:px-8">
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-sunk lg:hidden"
            aria-label={drawer ? "Close menu" : "Open menu"}
            onClick={() => setDrawer((d) => !d)}
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-auto">
            <UserMenu {...user} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
