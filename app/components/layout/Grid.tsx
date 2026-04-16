import { ReactNode } from "react";

/**
 * CSS Grid for all layout. Responsive columns; gaps use --grid-gap tokens (tighter than page gutters).
 * Cards/children must use col-span classes (e.g. col-span-4 sm:col-span-2 md:col-span-3 lg:col-span-6).
 */
export function Grid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-4 gap-[var(--grid-gap)] md:grid-cols-6 md:gap-[var(--grid-gap-md)] lg:grid-cols-12 lg:gap-[var(--grid-gap-md)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
