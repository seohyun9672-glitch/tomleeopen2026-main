"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import type { Locale, Messages } from "@/lib/content";
import { PageHero } from "./layout/PageHero";

const shellClassName =
  "page-shell min-h-[50vh] py-[var(--content-gap)] md:py-[var(--section-gap)] lg:py-[var(--section-gap)]";

/**
 * Floors the shell to the viewport below the header, so flex children (e.g.
 * Admin's sidebar + table area) fill the available height and internally
 * scrollable regions (a table's own body rows) get a bounded box in the
 * common case — but this is a minimum, not a hard cap: content taller than
 * the viewport (a long sidebar, a tall non-table tab) grows the shell and
 * lets the page scroll normally instead of being clipped, so nothing is
 * ever hidden behind an invisible boundary.
 */
const fillViewportShellClassName =
  "page-shell flex min-h-[calc(100dvh-var(--header-height))] flex-col py-[var(--content-gap)] md:py-[var(--section-gap)]";

// Locale-aware title lookup keyed by locale-neutral path (no /ko prefix).
// PageContainer uses this to override the server-rendered `title` prop with the
// correct language whenever the client locale differs from the initial server render.
const PATH_TITLES: Partial<Record<string, (t: Messages) => string>> = {
  "/draws":        (t) => t.drawsPage.heroTitle,
  "/schedule":     (t) => t.schedulePage.heroTitle,
  "/players":      (t) => t.playersPage.heroTitle,
  "/records":      (t) => t.recordsPage.heroTitle,
  "/registration":     (t) => t.registrationPage.heroTitle,
  "/registration/new": (t) => t.registrationPage.heroTitle,
  "/honour-roll":  (t) => t.heroTitle,
  "/rules":        (t) => t.rulesPage.heroTitle,
  "/overview":      (t) => t.overviewPage.heroTitle,
  "/court-booking": (t) => t.courtBookingPage.heroTitle,
  "/event":         (t) => t.eventPage.heroTitle,
};

export type PageContainerProps = {
  children: ReactNode | ((t: Messages, locale: Locale) => ReactNode);
  title?: string;
  titleActions?: ReactNode;
  beforeTitle?: ReactNode;
  /** Tailwind max-width class (e.g. "max-w-[700px]") applied to both the hero and children. */
  contentMaxWidth?: string;
  /**
   * Bounds the shell to the viewport height and clips overflow, so the page
   * never scrolls at the top level — the caller's `children` must manage
   * its own internal scroll region. See {@link fillViewportShellClassName}.
   */
  fillViewport?: boolean;
};

/** Max-width container with page padding. Optional page title row via `title`. */
export function PageContainer({ children, title, titleActions, beforeTitle, contentMaxWidth, fillViewport }: PageContainerProps) {
  const { t, locale } = useLocale();
  const pathname = usePathname();

  // Strip /ko prefix to get the locale-neutral path, then look up the locale-aware title.
  const cleanPath = pathname === "/ko" ? "/" : pathname.startsWith("/ko/") ? pathname.slice(3) : pathname;
  const resolvedTitle = title ?? PATH_TITLES[cleanPath]?.(t);

  const inner = (
    <>
      {beforeTitle != null ? (
        <div className={resolvedTitle != null ? "mb-[var(--content-gap)]" : undefined}>{beforeTitle}</div>
      ) : null}
      {resolvedTitle != null ? (
        <div className={fillViewport ? "shrink-0" : undefined}>
          <PageHero title={resolvedTitle} actions={titleActions} />
        </div>
      ) : null}
      {typeof children === "function" ? children(t, locale) : children}
    </>
  );

  return (
    <div className={fillViewport ? fillViewportShellClassName : shellClassName}>
      {contentMaxWidth ? (
        <div className={`mx-auto w-full ${contentMaxWidth} ${fillViewport ? "flex min-h-0 flex-1 flex-col" : ""}`}>{inner}</div>
      ) : fillViewport ? (
        <div className="flex min-h-0 flex-1 flex-col">{inner}</div>
      ) : (
        inner
      )}
    </div>
  );
}
