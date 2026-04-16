"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export function Checkbox({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="checkbox" className={`rounded [border-color:var(--input-border)] ${className}`.trim()} {...props} />;
}

export function CheckboxField({
  children,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode; className?: string }) {
  return (
    <label className={`inline-flex cursor-pointer items-start gap-2 ${className}`.trim()}>
      <Checkbox className="mt-0.5 shrink-0" {...props} />
      <span className="text-sm leading-snug [color:var(--section-text)]">{children}</span>
    </label>
  );
}
