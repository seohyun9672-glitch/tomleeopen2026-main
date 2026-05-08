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
        "flex flex-row flex-nowrap gap-[var(--content-gap)]",
        className
      )}
    >
      {children}
    </div>
  );
}
