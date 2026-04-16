"use client";

import type { ReactNode } from "react";

export type FormProps = {
  children: ReactNode;
};

export function Form({ children }: FormProps) {
  return (
    <div className="mx-auto w-full max-w-[var(--form-max-width)] rounded-2xl border border-[color:var(--color-filter-outline)] p-5 md:p-8">
      <div className="bg-[var(--form-surface-bg)] text-[var(--color-text-primary)] [--section-text:var(--color-text-primary)] [--input-text:var(--color-text-primary)] [--input-bg:var(--form-surface-bg)] [--input-focus-border:var(--outline-blue-focus)] [--input-focus-ring:var(--outline-blue-focus-ring)]">
        {children}
      </div>
    </div>
  );
}