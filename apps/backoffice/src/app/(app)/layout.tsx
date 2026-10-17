import { AppShell } from "@/components/shell/app-shell";
import { requireViewer } from "@/lib/viewer";
import { SECTIONS, can } from "@/lib/sections";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  // Only the sections this person can see are sent to the browser
  const sections = SECTIONS.filter((s) => can(viewer.access, s.id));
  return (
    <AppShell sections={sections} user={{ name: viewer.name, email: viewer.email, image: viewer.image }}>
      {children}
    </AppShell>
  );
}
