"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/app/components/ui/Button";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  );
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Max width class — defaults to max-w-md */
  maxWidthClass?: string;
  closeLabel?: string;
};

export function Modal({ open, onClose, title, children, maxWidthClass = "max-w-md", closeLabel = "Close" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--overlay-scrim-strong)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`relative flex flex-col w-full ${maxWidthClass} max-h-[calc(100dvh-4rem)] rounded-2xl bg-[var(--color-background)] shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="shrink-0 px-6 pt-6 pb-0">
            <h2 className="text-h2 pr-8">{title}</h2>
          </div>
        )}
        <IconButton
          aria-label={closeLabel}
          onClick={onClose}
          className="absolute right-4 top-4 z-10"
        >
          <XIcon />
        </IconButton>
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
