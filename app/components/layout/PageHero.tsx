"use client";

import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  /** e.g. admin sign-out — top-right of the hero row */
  actions?: ReactNode;
};

export function PageHero({ title, actions }: PageHeroProps) {
  return (
    <header className="flex flex-wrap items-start justify-between pr-[var(--page-hero-padding-x)] py-[var(--page-hero-padding-y)]">
      <div className="min-w-0 flex-1 border-l-6 border-[var(--color-primary-yellow)] pl-[var(--page-hero-padding-inline-start)]">
        <h1 className="uppercase">{title}</h1>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
