import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageTitle } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { Icon } from "@/components/ui/icon";
import { initials } from "@/lib/format";
import { requireViewer } from "@/lib/viewer";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer("/profile");
  return (
    <>
      <SiteHeader />
      <main>
        <div className="hidden md:block">
          <PageTitle title="Profile" back="/" />
        </div>
        <Container className="pt-12 md:pt-6">
          <div className="mx-auto flex max-w-[760px] flex-col gap-8">
            <div className="flex items-center gap-4">
              <span className="flex size-[50px] items-center justify-center rounded-full border-[3px] border-white bg-primary text-xl text-white ring-2 ring-green">
                {initials(viewer.name)}
              </span>
              <div>
                <p className="text-lg font-bold text-ink-strong">{viewer.name}</p>
                <p className="text-sm text-subtle">{viewer.email}</p>
                {viewer.isStaff && (
                  <p className="mt-1 text-xs font-semibold text-green-ink">Staff account · bookings are free</p>
                )}
              </div>
            </div>
            <section className="flex flex-col gap-4">
              <h2 className="text-base font-semibold uppercase text-muted">Account</h2>
              <div className="rounded-md border border-line px-5">
                <Row href="/bookings" title="My Bookings" text="All your reservations in one place." icon="time-fill" />
                <Row
                  href="/profile/notifications"
                  title="Notifications"
                  text="Set your notification preferences"
                  icon="bell-pin"
                  last
                />
              </div>
            </section>
            <form action={signOut} className="mt-6 rounded-md border border-line">
              <button className="flex w-full items-center gap-3 px-5 py-7 text-base font-semibold text-error hover:bg-error-50">
                <svg aria-hidden viewBox="0 0 24 24" className="size-6 fill-error">
                  <path d="M5 3h9a2 2 0 0 1 2 2v3h-2V5H5v14h9v-3h2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm11.6 5.4L20.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H9v-2h7.4l-1.2-1.2 1.4-1.4Z" />
                </svg>
                Logout
              </button>
            </form>
          </div>
        </Container>
      </main>
    </>
  );
}

function Row({
  href,
  title,
  text,
  icon,
  last,
}: {
  href: string;
  title: string;
  text: string;
  icon: "time-fill" | "bell-pin";
  last?: boolean;
}) {
  return (
    <Link href={href} className={`flex items-center gap-4 py-5 ${last ? "" : "border-b border-line"}`}>
      <Icon name={icon} />
      <span className="flex-1">
        <span className="block text-base font-semibold text-ink-strong">{title}</span>
        <span className="text-base text-muted">{text}</span>
      </span>
      <Icon name="caret-right" />
    </Link>
  );
}
