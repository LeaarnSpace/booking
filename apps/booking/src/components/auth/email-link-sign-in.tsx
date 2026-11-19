"use client";
// The page behind the Sign in button in the code email: one tap signs in with the code from the link, on
// whatever browser the email app opened.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { authClient } from "@/lib/auth-client";

export function EmailLinkSignIn({
  email,
  code,
  next,
  signUp,
  name,
}: {
  email: string;
  code: string;
  next: string;
  signUp: boolean;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(email && code ? null : "This sign-in link isn’t complete.");

  async function signIn() {
    setError(null);
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({ email, otp: code, ...(signUp && name ? { name } : {}) });
    if (error) {
      setBusy(false);
      return setError(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes."
          : "This link has expired or was already used.",
      );
    }
    router.replace(signUp ? `/welcome?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  }

  const retry = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex w-full max-w-[398px] flex-col items-center gap-4 rounded-md border border-line bg-white p-6 text-center md:max-w-[480px] md:p-8">
      {error && <StatusMark tone="error" />}
      <h1 className="text-2xl font-bold text-blue-700">LearnSpace</h1>
      {error ? (
        <>
          <p role="alert" className="text-base text-ink">
            {error}
          </p>
          <p className="text-sm text-subtle">Codes work for 10 minutes and only once. Ask for a new one to sign in.</p>
          <ButtonLink href={retry} className="w-full">
            Get a new code
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="text-base text-subtle">
            Sign in as
            <br />
            <span className="break-all font-semibold text-ink">{email}</span>
          </p>
          <Button type="button" className="w-full" disabled={busy} onClick={signIn}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </>
      )}
    </div>
  );
}
