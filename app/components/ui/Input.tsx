"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style {@link https://ui.shadcn.com/docs/components/input Input} mapped to this app’s form CSS variables.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 h-[var(--button-height-medium)] rounded-lg border border-[color:var(--input-border)] bg-[var(--input-bg)] px-4 py-2 text-[0.875rem] leading-normal text-[var(--input-text)] shadow-none outline-none transition-[border-color]",
        "placeholder:text-[var(--color-text-tertiary)]",
        "focus-visible:border-[color:var(--input-focus-border)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--input-text)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
