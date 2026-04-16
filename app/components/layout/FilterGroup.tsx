import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type FilterGroupProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Horizontal filter bar: one row left-to-right, wraps when needed. `filter-group` is kept for any future targeting.
 */
export function FilterGroup({ children, className }: FilterGroupProps) {
  return (
    <div
      className={cn(
        "filter-group flex w-full min-w-0 flex-row flex-wrap items-end gap-[var(--content-gap)]",
        className
      )}
    >
      {children}
    </div>
  );
}
