"use client";

import type { ReactNode } from "react";

export const labelClass = "block mb-1.5 text-sm font-medium [color:var(--section-text)]";

export function Label({
  htmlFor,
  className = "",
  children,
}: {
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`${labelClass} ${className}`.trim()}>
      {children}
    </label>
  );
}
