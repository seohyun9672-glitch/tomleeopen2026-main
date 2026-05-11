"use client";

type PageHeroProps = {
  title: string;
};

export function PageHero({ title }: PageHeroProps) {
  return (
    <header className="flex flex-nowrap py-[var(--page-hero-padding-y)]">
      <div className="w-full self-center border-l-6 border-[var(--color-primary-yellow)] pl-6 ">
        <h1>{title}</h1>
      </div>
    </header>
  );
}
