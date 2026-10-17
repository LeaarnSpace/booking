import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getViewer } from "@/lib/viewer";
import { env } from "@/lib/env";
import { DevSignIn, GoogleSignIn } from "./sign-in-buttons";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  domain_not_allowed: "That Google account isn't a Learn Space account. Sign in with your work email.",
  access_denied: "Google sign-in was cancelled.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getViewer()) redirect("/");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Sign-in didn't work. Please try again.") : null;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <span className="text-sm font-bold">Learn Space</span>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-4xl font-bold leading-tight tracking-tight">
            Researching and building for better learning outcomes.
          </p>
          <p className="mt-4 text-white/60">One place to run the website, bookings and the projects behind them.</p>
        </div>
        {/* Soft cobalt glow, echoing the website's layered panels */}
        <div
          className="absolute -bottom-40 -right-40 size-[520px] rounded-full bg-cobalt-600/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="absolute -top-24 right-24 size-64 rounded-full bg-beam-400/10 blur-3xl" aria-hidden="true" />
      </section>

      <section className="flex items-center justify-center bg-surface px-6 py-16">
        <div className="w-full max-w-sm">
          <Logo size={48} className="lg:hidden" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-strong lg:mt-0">Sign in to the back office</h1>
          <p className="mt-2 text-sm text-subtle">Use your Learn Space Google account.</p>

          {message && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-danger"
            >
              {message}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-4">
            {env.googleConfigured ? (
              <GoogleSignIn />
            ) : (
              <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-subtle">
                Google sign-in isn&apos;t set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment.
              </p>
            )}
            {env.devLogin && <DevSignIn domain={env.allowedDomains[0] ?? "example.com"} />}
          </div>
        </div>
      </section>
    </div>
  );
}
