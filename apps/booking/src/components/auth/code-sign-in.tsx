"use client";
// Sign up or log in without a password: enter your email (and name, when signing up), then the 6-digit code
// we email you, or continue with Google. Each option shows only when it's set up: without an email provider the
// page offers Google alone.
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const CODE_LENGTH = 6;
const input =
  "h-[52px] w-full rounded-md border border-line bg-white px-4 text-center text-base text-ink placeholder:text-placeholder focus:border-primary focus:outline-none";

export function CodeSignIn({
  mode,
  next,
  methods,
}: {
  mode: "sign-up" | "login";
  next: string;
  methods: { google: boolean; email: boolean };
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  async function sendCode() {
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error)
      return setError(
        error.status === 429
          ? "Too many codes requested. Please wait a few minutes."
          : "We couldn't send a code to that address. Check it and try again.",
      );
    setStep("code");
    setCode(Array(CODE_LENGTH).fill(""));
    setTimeout(() => boxes.current[0]?.focus(), 0);
  }

  async function verify(digits = code) {
    const otp = digits.join("");
    if (otp.length !== CODE_LENGTH) return setError("Enter all 6 digits");
    setError(null);
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp,
      ...(mode === "sign-up" && name.trim() ? { name: name.trim() } : {}),
    });
    if (error) {
      setBusy(false);
      return setError(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes."
          : "That code isn't right or has expired.",
      );
    }
    router.replace(mode === "sign-up" ? `/welcome?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  }

  function typeDigit(i: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return setCode(code.map((d, j) => (j === i ? "" : d)));
    // Pasting the whole code fills every box
    const nextCode = [...code];
    for (let k = 0; k < digits.length && i + k < CODE_LENGTH; k++) nextCode[i + k] = digits[k];
    setCode(nextCode);
    const focus = Math.min(i + digits.length, CODE_LENGTH - 1);
    boxes.current[focus]?.focus();
    if (nextCode.every(Boolean)) void verify(nextCode);
  }

  const continueWithGoogle = () =>
    authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      // First sign-in with Google: the "All set" page, then where they were going
      newUserCallbackURL: `/welcome?next=${encodeURIComponent(next)}`,
    });

  const switchLink = (
    <p className="text-center text-sm text-ink">
      {mode === "sign-up" ? "Already have an account? " : "New here? "}
      <Link
        href={`/${mode === "sign-up" ? "login" : "sign-up"}?next=${encodeURIComponent(next)}`}
        className="font-semibold text-primary hover:underline"
      >
        {mode === "sign-up" ? "Login" : "Sign up"}
      </Link>
    </p>
  );

  return (
    <div className="flex w-full max-w-[398px] flex-col gap-4 rounded-md border border-line bg-white p-6 md:max-w-[480px] md:p-8">
      <div className="relative flex flex-col items-center gap-1 text-center">
        {step === "code" ? (
          <button
            type="button"
            onClick={() => setStep("email")}
            aria-label="Change email"
            className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-sunk"
          >
            <Icon name="arrow-left" />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Back to home"
            className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-sunk"
          >
            <Icon name="arrow-left" />
          </Link>
        )}
        <h1 className="pt-1 text-2xl font-bold text-blue-700">LearnSpace</h1>
        <p className="text-xs text-subtle">
          {step === "email" ? (
            mode === "sign-up" ? (
              methods.email ? (
                "Create your account to book"
              ) : (
                "Create your account with Google to book"
              )
            ) : methods.email ? (
              "Log in to continue"
            ) : (
              "Log in with your Google account"
            )
          ) : (
            <>
              A code has been sent to your email
              <br />
              <span className="font-semibold text-ink">{email}</span>
            </>
          )}
        </p>
      </div>

      {step === "email" ? (
        <div className="flex flex-col gap-4">
          {methods.email ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
            >
              {mode === "sign-up" && (
                <label className="block">
                  <span className="sr-only">Full name</span>
                  <input
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    className={input}
                  />
                </label>
              )}
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                />
              </label>
              {switchLink}
              <Button type="submit" disabled={busy}>
                {busy ? "Sending code…" : "Continue"}
              </Button>
              {methods.google && (
                <Button type="button" variant="secondary" disabled={busy} onClick={continueWithGoogle}>
                  Continue with Google
                </Button>
              )}
            </form>
          ) : (
            <>
              <Button type="button" onClick={continueWithGoogle}>
                Continue with Google
              </Button>
              {switchLink}
            </>
          )}
          <div className="flex items-center gap-4 px-2 text-sm text-ink">
            <span className="h-px flex-1 bg-muted/60" />
            Or
            <span className="h-px flex-1 bg-muted/60" />
          </div>
          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-md border border-line text-base text-ink hover:bg-sunk"
          >
            Continue as Guest
          </Link>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <fieldset className="flex justify-between gap-2">
            <legend className="sr-only">6-digit code</legend>
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1}`}
                maxLength={i === 0 ? CODE_LENGTH : 1}
                onChange={(e) => typeDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus();
                }}
                className={cn(
                  "size-10 rounded-sm border border-blue-700 bg-blue-100 text-center text-base font-bold text-blue-700 focus:outline-2 focus:outline-primary",
                  "md:size-12",
                )}
              />
            ))}
          </fieldset>
          <p className="text-center text-sm text-ink">
            Didn’t get the code?{" "}
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await sendCode();
                setNotice("A new code is on its way.");
              }}
              className="font-semibold text-primary hover:underline"
            >
              Resend
            </button>
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Verify"}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-error-ink">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="text-center text-sm text-green-ink">
          {notice}
        </p>
      )}
    </div>
  );
}
