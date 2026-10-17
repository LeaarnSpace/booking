"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleSignIn() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signIn.social({ provider: "google", callbackURL: "/", errorCallbackURL: "/sign-in" });
      }}
    >
      <GoogleMark />
      {busy ? "Redirecting to Google…" : "Continue with Google"}
    </Button>
  );
}

/** Local development only (DEV_LOGIN=true): sign in or create an account with an email and password */
export function DevSignIn({ domain }: { domain: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const signIn = await authClient.signIn.email({ email, password });
    const result = signIn.error ? await authClient.signUp.email({ email, password, name }) : signIn;
    setBusy(false);
    if (result.error) return setError(result.error.message ?? "Sign-in failed");
    router.replace("/");
    router.refresh();
  }

  return (
    <form action={submit} className="flex flex-col gap-3 rounded-lg border border-dashed border-beam-400 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a4f00]">Development sign-in</p>
      <input
        name="email"
        type="email"
        required
        placeholder={`you@${domain}`}
        className="h-10 rounded-md border border-line px-3 text-sm"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Password (8+ characters)"
        className="h-10 rounded-md border border-line px-3 text-sm"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
