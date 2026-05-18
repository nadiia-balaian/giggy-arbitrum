"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "info" | "danger";

interface DialogProps {
  open: boolean;
  /** Close the dialog without confirming. */
  onClose: () => void;
  /** Optional — when provided, the dialog acts as a confirm prompt with
   *  Cancel + Confirm buttons. When omitted, just shows a single OK. */
  onConfirm?: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "info",
}: DialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const showConfirm = !!onConfirm;
  const finalConfirmLabel =
    confirmLabel ?? (variant === "danger" ? "Delete" : "Confirm");

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-3xl border-ink-3 bg-white p-7 shadow-doodle-lg animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {variant === "danger" ? (
              <AlertTriangle className="size-6 shrink-0 text-rose-700" strokeWidth={2.5} />
            ) : null}
            <h2
              id="dialog-title"
              className="font-display text-2xl font-bold leading-tight tracking-tight"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full border-ink-2 bg-white shadow-doodle-sm press press-hover"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 text-sm leading-relaxed text-ink/80">
          {message}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {showConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border-ink-3 bg-white px-5 py-2 text-sm font-semibold tracking-tight shadow-doodle-sm press press-hover"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  "inline-flex items-center justify-center rounded-full border-ink-3 px-5 py-2 text-sm font-semibold tracking-tight shadow-doodle press press-hover",
                  variant === "danger" ? "bg-coral text-ink" : "bg-yellow text-ink",
                )}
              >
                {finalConfirmLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border-ink-3 bg-yellow px-5 py-2 text-sm font-semibold tracking-tight shadow-doodle press press-hover"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
