import { type ReactNode } from "react";

export interface SectionProps {
  title: ReactNode;
  id?: string;
  children: ReactNode;
  zebra?: boolean;
}

export function Section({ title, id, children, zebra }: SectionProps) {
  const inner = (
    <section
      id={zebra === undefined ? id : undefined}
      className="flex flex-col gap-[var(--content-gap)] md:gap-[var(--section-gap)]"
    >
      <h2>{title}</h2>
      {children}
    </section>
  );

  if (zebra === undefined) return inner;

  return (
    <div
      id={id}
      className={`w-full py-[var(--layout-gap)] ${zebra ? "bg-home-zebra-with-grid" : "bg-page-with-grid"}`}
    >
      <div className="page-shell">{inner}</div>
    </div>
  );
}
