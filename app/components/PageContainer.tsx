import type { ReactNode } from "react";

import { PageHero } from "./layout/PageHero";

const shellClassName =
  "mx-auto w-full min-h-[50vh] px-[var(--page-inline-padding)] py-[var(--content-gap)] md:py-[var(--section-gap)] lg:max-w-[var(--container-max-w)] lg:py-[var(--section-gap)]";

export type PageContainerProps = {
  children: ReactNode;
  /** When set, renders {@link PageHero} above `children` (same padded shell). */
  title?: string;
  /** Passed to {@link PageHero} (e.g. admin sign-out). */
  actions?: ReactNode;
  /** Renders before {@link PageHero} when `title` is set (e.g. breadcrumb). */
  beforeTitle?: ReactNode;
};

/** Max-width container; same padding as `GridContainer` at every breakpoint. Optional page title row via `title` / `actions`. */
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
