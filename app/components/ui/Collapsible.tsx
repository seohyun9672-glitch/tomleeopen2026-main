"use client";

import type { ReactNode } from "react";

type CollapsibleProps = {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  squared?: boolean;
};

export function Collapsible({ title, open, onToggle, children, squared = false }: CollapsibleProps) {
  return (
    <div className={squared ? "bg-[var(--color-surface-muted)]" : "rounded-lg border border-[var(--color-border-ui)] bg-[var(--color-surface-muted)]"}>
      <button
        type="button"
        onClick={onToggle}
        className={[
          !squared && "rounded-lg",
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-muted)]",
          open ? "bg-[var(--color-surface-muted)]" : "bg-[var(--color-surface)]",
        ].filter(Boolean).join(" ")}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-[var(--color-border-ui)]">
          {children}
        </div>
      )}
    </div>
  );
}
