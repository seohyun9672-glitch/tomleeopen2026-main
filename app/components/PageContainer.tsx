"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import type { Messages } from "@/lib/content";
import { PageHero } from "./layout/PageHero";

const shellClassName =
  "page-shell min-h-[50vh] py-[var(--content-gap)] md:py-[var(--section-gap)] lg:py-[var(--section-gap)]";

// Locale-aware title lookup keyed by locale-neutral path (no /ko prefix).
// PageContainer uses this to override the server-rendered `title` prop with the
// correct language whenever the client locale differs from the initial server render.
const PATH_TITLES: Partial<Record<string, (t: Messages) => string>> = {
  "/draws":        (t) => t.drawsPage.heroTitle,
  "/schedule":     (t) => t.schedulePage.heroTitle,
  "/players":      (t) => t.playersPage.heroTitle,
  "/registration": (t) => t.registrationPage.heroTitle,
  "/media":        (t) => t.mediaPage.heroTitle,
  "/honour-roll":  (t) => t.heroTitle,
  "/rules":        (t) => t.rulesPage.heroTitle,
  "/overview":     (t) => t.overviewPage.heroTitle,
  "/admin":        (t) => t.adminPage.heroTitle,
};

export type PageContainerProps = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  beforeTitle?: ReactNode;
  /** Tailwind max-width class (e.g. "max-w-[700px]") applied to both the hero and children. */
  contentMaxWidth?: string;
};

/** Max-width container with page padding. Optional page title row via `title` / `actions`. */
export function PageContainer({ children, title, actions, beforeTitle, contentMaxWidth }: PageContainerProps) {
  const { t } = useLocale();
  const pathname = usePathname();

  // Strip /ko prefix to get the locale-neutral path, then look up the locale-aware title.
  const cleanPath = pathname === "/ko" ? "/" : pathname.startsWith("/ko/") ? pathname.slice(3) : pathname;
  const resolvedTitle = PATH_TITLES[cleanPath]?.(t) ?? title;

  const inner = (
    <>
      {beforeTitle != null ? (
        <div className={resolvedTitle != null ? "mb-[var(--content-gap)]" : undefined}>{beforeTitle}</div>
      ) : null}
      {resolvedTitle != null ? <PageHero title={resolvedTitle} actions={actions} /> : null}
      {children}
    </>
  );

  return (
    <div className={shellClassName}>
      {contentMaxWidth ? (
        <div className={`mx-auto w-full ${contentMaxWidth}`}>{inner}</div>
      ) : (
        inner
      )}
    </div>
  );
}
