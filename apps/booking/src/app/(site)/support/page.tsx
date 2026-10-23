import type { Metadata } from "next";
import { Footer } from "@/components/shell/footer";
import { Container } from "@/components/shell/page";
import { SiteHeader } from "@/components/shell/site-header";
import { FaqList } from "@/components/ui/faq";
import { SUPPORT_FAQS } from "@/lib/content";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  const { email, phone } = env.support;
  return (
    <>
      <SiteHeader />
      <main className="bg-sunk pb-12">
        <Container className="flex flex-col gap-6 pt-8 md:pt-12">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-ink-strong">How can we help you today?</h1>
            <p className="text-base text-muted">Read the common questions or get in touch below.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:max-w-[640px]">
            <ContactCard href={`mailto:${email}`} title="Email Support" detail={email} icon="mail" />
            {phone && (
              <ContactCard href={`tel:${phone.replace(/\s/g, "")}`} title="Phone Call" detail={phone} icon="phone" />
            )}
          </div>
          <section className="flex flex-col gap-6 rounded-md border border-line bg-white px-5 py-6">
            <h2 className="text-2xl font-bold text-ink-strong">Frequently Asked Questions</h2>
            <FaqList faqs={SUPPORT_FAQS} />
          </section>
          <section className="flex items-center justify-between gap-4 rounded-lg bg-primary px-5 py-6 text-white">
            <div>
              <h2 className="text-base font-bold">Didn’t find your answer?</h2>
              <p className="text-sm text-white/80">Email us and a member of our team will get back to you.</p>
            </div>
            <a
              href={`mailto:${email}`}
              className="shrink-0 rounded-md bg-white px-6 py-3 text-base text-ink hover:bg-sunk"
            >
              Email us
            </a>
          </section>
        </Container>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}

function ContactCard({
  href,
  title,
  detail,
  icon,
}: {
  href: string;
  title: string;
  detail: string;
  icon: "mail" | "phone";
}) {
  return (
    <a href={href} className="flex flex-col gap-3 rounded-md border border-line bg-white p-4 hover:border-green">
      <span className="flex size-10 items-center justify-center rounded-full bg-green-50">
        <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-green">
          {icon === "mail" ? (
            <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.4 7H4v.6l8 5.5 8-5.5V7h-.4L12 12.2Z" />
          ) : (
            <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
          )}
        </svg>
      </span>
      <span className="text-base font-bold text-ink-strong">{title}</span>
      <span className="truncate text-sm text-subtle">{detail}</span>
    </a>
  );
}
