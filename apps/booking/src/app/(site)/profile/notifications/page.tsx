import type { Metadata } from "next";
import { customerEmailChoices, getNotificationSettings } from "@learnspace/bookings";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { requireViewer } from "@/lib/viewer";
import { SettingSwitch } from "./setting-switch";

export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const viewer = await requireViewer("/profile/notifications");
  // Only emails we actually send are offered
  const [settings, choices] = await Promise.all([getNotificationSettings(viewer.id), customerEmailChoices()]);
  return (
    <>
      <SiteHeader />
      <main>
        <PageTitle title="Notification settings" back="/profile" />
        <Container className="pt-6">
          <div className="mx-auto flex max-w-[760px] flex-col gap-4">
            <h2 className="text-base font-semibold uppercase text-muted">Email</h2>
            {choices.length > 0 ? (
              <ul className="rounded-md border border-line px-5">
                {choices.map((s, i) => (
                  <li key={s.id} className={i < choices.length - 1 ? "border-b border-line" : undefined}>
                    <SettingSwitch setting={s.id} label={s.label} on={settings[s.id]} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-ink-strong">We don&apos;t send booking emails at the moment.</p>
            )}
            <p className="text-sm text-subtle">Sign-in codes are always sent, whatever you choose here.</p>
          </div>
        </Container>
      </main>
    </>
  );
}
