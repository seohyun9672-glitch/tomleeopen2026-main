"use client";

import { useEffect, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/app/components/ui/Button";

export type ModalAction = {
  label: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  form?: string;
  disabled?: boolean;
  /** Overrides the default variant for this footer action. */
  variant?: ButtonVariant;
};

export type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  /** When false, children stay mounted but the modal overlay is hidden. Defaults to true. */
  open?: boolean;
  title?: ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  footer?: ReactNode;
  maxWidthClassName?: string;
  zClassName?: string;
  ariaLabelledBy?: string;
  closeLabel?: string;
};

export function Modal({
  children,
  onClose,
  open = true,
  title,
  primaryAction,
  secondaryAction,
  footer,
  maxWidthClassName = "w-full md:max-w-[var(--form-max-width)]",
  zClassName = "z-[120]",
  ariaLabelledBy = "modal-title",
  closeLabel = "Close",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return (
      <div hidden aria-hidden="true">
        {children}
      </div>
    );
  }

  const hasDefaultFooter = !footer && (primaryAction || secondaryAction);

  return (
    <div
      className={`fixed inset-0 ${zClassName} flex items-stretch justify-center p-0 md:items-center md:p-4`}
      style={{ backgroundColor: "var(--modal-backdrop-scrim)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? ariaLabelledBy : undefined}
    >
      <div
        className={`flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none bg-[var(--form-surface-bg)] shadow-xl md:h-auto md:max-h-[90vh] md:rounded-2xl ${maxWidthClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="shrink-0 border-b border-[var(--color-border-subtle)] px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id={ariaLabelledBy} className="text-h2 m-0 text-[var(--color-text-primary)]">
                {title}
              </h2>

              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset-form)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--color-border-subtle)] px-4 py-3 md:px-6">
            {footer}
          </div>
        ) : null}

        {hasDefaultFooter ? (
          <div className="shrink-0 border-t border-[var(--color-border-subtle)] px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-3">
              {secondaryAction ? (
                <Button
                  variant={secondaryAction.variant ?? "secondary"}
                  onClick={secondaryAction.onClick}
                  type={secondaryAction.type ?? "button"}
                  form={secondaryAction.form}
                  disabled={secondaryAction.disabled}
        
                >
                  {secondaryAction.label}
                </Button>
              ) : null}

              {primaryAction ? (
                <Button
                  variant={primaryAction.variant ?? "primary"}
                  onClick={primaryAction.onClick}
                  type={primaryAction.type ?? "button"}
                  form={primaryAction.form}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.label}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
