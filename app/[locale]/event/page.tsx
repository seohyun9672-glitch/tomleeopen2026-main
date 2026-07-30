"use client";

import { PageContainer } from "@/app/components/PageContainer";
import { Button } from "@/app/components/ui/Button";

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
      <path d="M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

export default function EventPage() {
  return (
    <PageContainer>
      {(t, locale) => {
        const { bestPhotoAwards } = t.eventPage;
        const p = locale === "ko" ? "/ko" : "";
        return (
          <div className="flex flex-col gap-[var(--layout-gap)]">
            <div className="overflow-hidden rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] shadow-md">
              <div className="flex flex-col gap-[var(--content-gap)] sm:flex-row sm:items-stretch">
                <div className="flex shrink-0 items-center justify-center bg-[var(--color-primary-blue)] p-[var(--section-gap)] text-white sm:w-64">
                  <TrophyIcon />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[var(--element-gap)] p-[var(--content-gap)] pt-0 sm:justify-center sm:pt-[var(--content-gap)] md:p-[var(--section-gap)] md:pl-0">
                  <h2 className="text-h1 m-0 text-[var(--color-text-primary)]">{bestPhotoAwards.title}</h2>
                  <p className="m-0 text-sm leading-snug text-[var(--text-secondary)]">{bestPhotoAwards.intro}</p>
                  <div className="mt-3">
                    <Button href={`${p}/media?tab=photoAlbum`} variant="secondary" size="medium">
                      {bestPhotoAwards.cta}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </PageContainer>
  );
}
