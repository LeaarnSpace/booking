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

/** Plain-English versions of the sign-in errors */
function describe(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429) return "Too many attempts. Wait a minute, then try again.";
  switch (error.code) {
    case "INVALID_OTP":
      return "That code isn't right. Check the email and try again.";
    case "OTP_EXPIRED":
      return "That code has expired. Send a new one.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many wrong codes. Send a new one.";
    default:
      return error.message ?? "Something went wrong. Please try again.";
  }
}

/**
 * Local development only (DEV_EMAIL_SIGN_IN=true): sign in with a 6-digit code sent by email. In
 * development the email lands in Mailpit (http://localhost:8025). There are no passwords.
 */
export function EmailCodeSignIn({ domain }: { domain: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(address: string) {
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" });
    setBusy(false);
    if (error) return setError(describe(error));
    setEmail(address);
  }

  async function verify(form: FormData) {
    if (!email) return;
    setBusy(true);
    setError(null);
    const otp = String(form.get("code")).replace(/\D/g, "");
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (error) return setError(describe(error));
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-beam-400 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7a4f00]">Development: sign in with a code</p>
      {email === null ? (
        <form
          action={(form) => sendCode(String(form.get("email")).trim().toLowerCase())}
          className="flex flex-col gap-3"
        >
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={`you@${domain}`}
            className="h-10 rounded-md border border-line px-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </Button>
        </form>
      ) : (
        <form action={verify} className="flex flex-col gap-3">
          <p className="text-sm text-subtle">
            We sent a 6-digit code to <strong className="text-ink">{email}</strong>. It expires in 10 minutes.
          </p>
          <input
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="123 456"
            aria-label="Sign-in code"
            className="h-12 rounded-md border border-line px-3 text-center text-xl font-bold tracking-[0.4em]"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <div className="flex justify-between text-xs">
            <button type="button" className="text-cobalt-600" onClick={() => sendCode(email)} disabled={busy}>
              Send a new code
            </button>
            <button type="button" className="text-subtle" onClick={() => setEmail(null)}>
              Use a different email
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
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
