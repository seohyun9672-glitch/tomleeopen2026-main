"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, IconButton } from "@/app/components/ui/Button";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export type ModalAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** If provided, renders as type="submit" targeting this form id. */
  form?: string;
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Primary (right) footer action. When provided, the footer renders. */
  primaryAction?: ModalAction;
  /** Secondary (left) footer action. Defaults to a Close button when primaryAction is present. */
  secondaryAction?: ModalAction;
  /** Shows a trash icon button in the header next to the close button. */
  onDestructive?: () => void;
  destructiveLabel?: string;
  destructiveDisabled?: boolean;
  /** Max width class — defaults to max-w-md */
  maxWidthClass?: string;
  closeLabel?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  onDestructive,
  destructiveLabel = "Delete",
  destructiveDisabled = false,
  maxWidthClass = "max-w-md",
  closeLabel = "Close",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const secondary = secondaryAction ?? (primaryAction ? { label: closeLabel, onClick: onClose } : undefined);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--overlay-scrim-strong)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex w-full min-w-[min(100%,20rem)] flex-col ${maxWidthClass} max-h-[calc(100dvh-4rem)] rounded-2xl bg-[var(--color-background)] shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-6 pt-5 pb-4">
          {title ? <h2 className="text-h2">{title}</h2> : <span />}
          <div className="flex items-center gap-1 shrink-0">
            {onDestructive && (
              <IconButton
                aria-label={destructiveLabel}
                onClick={onDestructive}
                disabled={destructiveDisabled}
                className="text-[var(--color-status-error)]"
              >
                <TrashIcon />
              </IconButton>
            )}
            <IconButton aria-label={closeLabel} onClick={onClose}>
              <XIcon />
            </IconButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-0 pb-6">
          {children}
        </div>

        {/* Footer — rendered when primaryAction is provided */}
        {primaryAction && (
          <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-6 pt-4 pb-6 border-t border-[var(--color-border-ui)]">
            {secondary && (
              <Button variant="secondary" size="small" type="button" onClick={secondary.onClick} disabled={secondary.disabled} className="w-full sm:w-auto">
                {secondary.label}
              </Button>
            )}
            <Button size="small" type={primaryAction.form ? "submit" : "button"} form={primaryAction.form} onClick={primaryAction.onClick} disabled={primaryAction.disabled} className="w-full sm:w-auto">
              {primaryAction.label}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
