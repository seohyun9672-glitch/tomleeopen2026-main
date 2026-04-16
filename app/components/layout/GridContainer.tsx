import { ReactNode } from "react";

/**
 * Same container padding as PageContainer at every breakpoint. Desktop: max-width 1280px, mx-auto.
 * Use as the outer wrapper so all sections align to the same container edges.
 */
export function GridContainer({
  children,
  className = "",
  /** No top padding — sit flush under sticky header (e.g. home hero). */
  flushTop = false,
}: {
  children: ReactNode;
  className?: string;
  flushTop?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full px-[var(--content-gap)] md:px-[var(--section-gap)] lg:max-w-[var(--container-max-w)] lg:px-[var(--layout-gap)] ${flushTop ? "pt-0" : "pt-[var(--content-gap)] md:pt-[var(--section-gap)]"} pb-[var(--content-gap)] md:pb-[var(--section-gap)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
