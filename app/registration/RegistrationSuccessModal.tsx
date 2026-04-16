"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";

type Props = {
  message: string;
  onClose: () => void;
};

export function RegistrationSuccessModal({ message, onClose }: Props) {
  const { t } = useLocale();
  const rf = t.registrationForm;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--modal-backdrop-scrim)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-success-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--form-surface-bg)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4">
          <h2 id="registration-success-title" className="text-h2 m-0 text-[var(--color-text-primary)]">
            {rf.success.completed}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.shared.modal.close}
            className="shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset-form)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {message ? (
          <div className="px-5 py-4">
            <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{message}</p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="border-t border-[var(--color-border-subtle)] px-5 py-3">
          <Button variant="primary" size="medium" onClick={onClose}>
            {t.shared.modal.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
