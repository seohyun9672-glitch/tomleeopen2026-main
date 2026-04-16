import { ReactNode } from "react";
import { Grid } from "./layout/Grid";

export interface SectionProps {
  /** Section heading */
  title: ReactNode;
  /** Optional subtext/note below the heading. Omit or pass undefined for no note. */
  note?: ReactNode;
  /** Optional id for anchor linking (e.g. id="clubs") */
  id?: string;
  /** Optional className on the outer <section> */
  className?: string;
  /** When true, wrap children in Grid (4/6/12 cols, spacing-scale gaps). Use for Sponsors, Businesses, Clubs, Lessons. */
  useGrid?: boolean;
  /** Extra classes on the inner {@link Grid} when `useGrid` is true (e.g. tighter `gap-*` on the homepage). */
  gridClassName?: string;
  /** Optional: use for section titles on dark background (e.g. homepage). When set, note uses same color. */
  titleClassName?: string;
  /** When true, apply section text color to content (no background, border, or padding). */
  contentWhite?: boolean;
  children: ReactNode;
}

export function Section({
  title,
  note,
  id,
  className = "",
  useGrid = false,
  gridClassName = "",
  titleClassName,
  contentWhite = false,
  children,
}: SectionProps) {
  const headingClass = titleClassName ?? "text-[var(--color-text-primary)]";

  return (
    <section
      id={id}
      className={className.trim()}
    >
      <h2 className={`${headingClass} mb-[var(--content-gap)] md:mb-[var(--section-gap)]`.trim()}>{title}</h2>
      {note != null && (
        <p className={`text-body mb-[var(--content-gap)] md:mb-[var(--section-gap)] ${titleClassName ?? "text-[var(--color-text-secondary)]"}`}>
          {note}
        </p>
      )}
      {useGrid ? (
        <Grid className={gridClassName}>{children}</Grid>
      ) : contentWhite ? (
        <div className="flex flex-col gap-[var(--content-gap)] md:gap-[var(--section-gap)] text-[var(--section-text)]">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
