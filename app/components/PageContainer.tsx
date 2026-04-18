import type { ReactNode } from "react";

import { PageHero } from "./layout/PageHero";

const shellClassName =
  "page-shell min-h-[50vh] py-[var(--content-gap)] md:py-[var(--section-gap)] lg:py-[var(--section-gap)]";

export type PageContainerProps = {
  children: ReactNode;
  /** When set, renders {@link PageHero} above `children` (same padded shell). */
  title?: string;
  /** Passed to {@link PageHero} (e.g. admin sign-out). */
  actions?: ReactNode;
  /** Renders before {@link PageHero} when `title` is set (e.g. breadcrumb). */
  beforeTitle?: ReactNode;
};

/** Max-width container with page padding. Optional page title row via `title` / `actions`. */
export function PageContainer({ children, title, actions, beforeTitle }: PageContainerProps) {
  return (
    <div className={shellClassName}>
      {beforeTitle != null ? (
        <div className={title != null ? "mb-[var(--content-gap)]" : undefined}>{beforeTitle}</div>
      ) : null}
      {title != null ? <PageHero title={title} actions={actions} /> : null}
      {children}
    </div>
  );
}
