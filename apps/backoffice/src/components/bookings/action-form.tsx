"use client";
// A form that runs a server action and shows its error, if any. Actions redirect when they succeed.
// Submitting through onSubmit (rather than the form's action prop) stops React clearing the inputs, so a
// validation error doesn't wipe what the person typed.
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Result } from "@/lib/bookings/store";

type Action = (previous: Result | null, form: FormData) => Promise<Result>;

const Pending = createContext(false);

export function ActionForm({
  action,
  className,
  resetOnSuccess,
  savedLabel,
  children,
}: {
  action: Action;
  className?: string;
  /** Clear the inputs after a successful submit (for forms that don't redirect) */
  resetOnSuccess?: boolean;
  /** Shown after a successful submit, for forms that stay on the page */
  savedLabel?: string;
  children: React.ReactNode;
}) {
  const [state, run, pending] = useActionState(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) form.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={form}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state?.ok && savedLabel && !pending && (
        <p role="status" className="basis-full text-sm text-confirmed-ink">
          {savedLabel}
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" className="basis-full text-sm text-error-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Submit button that shows `pendingLabel` while the action runs, and can ask for confirmation first */
export function SubmitButton({
  pendingLabel,
  confirmMessage,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string; confirmMessage?: string }) {
  const pending = useContext(Pending);
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
