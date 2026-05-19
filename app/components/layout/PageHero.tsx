"use client";

import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  actions?: ReactNode;
};

export function PageHero({ title, actions }: PageHeroProps) {
  return (
    <header className="flex flex-nowrap items-center py-[var(--page-hero-padding-y)]">
      <div className="flex-1 self-center border-l-6 border-[var(--color-primary-yellow)] pl-6">
        <h1>{title}</h1>
      </div>
      {actions && <div className="ml-4 shrink-0">{actions}</div>}
    </header>
  );
}
