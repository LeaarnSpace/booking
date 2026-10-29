"use client";
// "Are you sure?" in a modal, instead of the browser's confirm() popup. Built on <dialog>, so the browser keeps
// focus inside it, closes it on Esc and hides the page behind it from screen readers.
import { useEffect, useRef } from "react";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Go back",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      // Esc, or the dialog closing any other way
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog itself, outside the card
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-lg bg-white p-0 text-ink shadow-pop backdrop:bg-ink-strong/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h2 id="confirm-title" className="text-xl font-bold text-ink-strong">
            {title}
          </h2>
          <p id="confirm-message" className="text-base text-muted">
            {message}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} autoFocus>
            {cancelLabel}
          </Button>
          <Button type="button" className="flex-1 bg-error hover:bg-error-ink" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
