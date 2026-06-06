"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ChipOption = { value: string; label: string; chipClassName?: string };

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  chipOptions?: ChipOption[];
};

export function Select({ className = "", children, chipOptions, onChange, value, ...props }: SelectProps) {
  if (chipOptions) {
    return (
      <div className="flex flex-wrap gap-2">
        {chipOptions.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange?.({ target: { value: opt.value } } as React.ChangeEvent<HTMLSelectElement>)
              }
              className={cn(
                "inline-flex px-2.5 py-1 text-sm rounded-full border cursor-pointer transition-opacity",
                isSelected
                  ? opt.chipClassName
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border-[var(--color-border-ui)] opacity-60 hover:opacity-100"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      className={`form-control-input form-control-select ${className}`.trim()}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2318181b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
      }}
      onChange={onChange}
      value={value}
      {...props}
    >
      {children}
    </select>
  );
}
