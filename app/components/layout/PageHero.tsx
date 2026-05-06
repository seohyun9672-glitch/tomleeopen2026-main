"use client";

import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  /** e.g. admin sign-out — top-right of the hero row */
  actions?: ReactNode;
};

export function PageHero({ title, actions }: PageHeroProps) {
  return (
    <header className="flex flex-nowrap py-[var(--page-hero-padding-y)]">
      <div className="w-full self-center border-l-6 border-[var(--color-primary-yellow)] pl-6 ">
        <h1>{title}</h1>
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}
