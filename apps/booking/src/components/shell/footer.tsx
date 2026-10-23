import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { env } from "@/lib/env";
import { Container } from "./page";

export function Footer() {
  return (
    <footer className="bg-night pb-24 md:pb-0">
      <Container className="py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex max-w-[250px] flex-col gap-2 pb-5">
            <Logo className="size-[100px] md:size-[100px]" />
            <p className="text-sm text-placeholder">
              Professional hybrid booking system offering premium spaces for meeting, production, and focused work.
            </p>
          </div>
          <div className="flex flex-col gap-2 py-5 md:min-w-[260px]">
            <h2 className="text-xl font-semibold tracking-[0.012em] text-white">Enquiries</h2>
            <ul className="flex flex-col gap-3 text-sm text-placeholder">
              <li>{env.support.address}</li>
              <li>
                <a href={`mailto:${env.support.email}`} className="hover:text-white">
                  {env.support.email}
                </a>
              </li>
              {env.support.phone && (
                <li>
                  <a
                    href={`tel:${env.support.phone.replace(/\s/g, "")}`}
                    className="tracking-[0.014em] hover:text-white"
                  >
                    {env.support.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-line py-5 text-sm text-placeholder">
          <p>© {new Date().getFullYear()} Learn Space Ltd. All rights reserved.</p>
          <Link href="/support" className="hover:text-white">
            Support
          </Link>
        </div>
      </Container>
    </footer>
  );
}
