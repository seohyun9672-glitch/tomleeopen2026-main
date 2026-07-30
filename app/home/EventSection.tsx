"use client";

import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";

export type EventPreviewPhoto = { image: string; title: string };

function TrophyWatermark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute -right-6 -bottom-8 h-40 w-40 text-white opacity-10 sm:h-56 sm:w-56"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" />
      <path d="M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function EventSection({ photos = [] }: { photos?: EventPreviewPhoto[] }) {
  const { t, locale } = useLocale();
  const hp = t.homePage;
  const p = locale === "ko" ? "/ko" : "";
  const uploadHref = `${p}/media?tab=photoAlbum`;

  return (
    <div className="w-full py-[var(--layout-gap)]">
      <div className="page-shell">
        <div className="relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-2xl bg-[var(--color-primary-blue)] px-6 py-10 shadow-lg sm:px-10 sm:py-14">
          <TrophyWatermark />
          <div className="flex flex-col gap-1.5 max-w-xl">
            <h2 className="text-h2 m-0 !text-white !tracking-wide drop-shadow-sm">{hp.event.title}</h2>
            <p className="m-0 text-sm leading-snug !text-white/90">{hp.event.blurb}</p>
          </div>
          {photos.length > 0 && (
            <div className="relative flex flex-wrap gap-3">
              {photos.slice(0, 5).map((photo, i) => (
                <a
                  key={i}
                  href={uploadHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg xs:h-24 xs:w-24 sm:h-28 sm:w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image}
                    alt={photo.title}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
          <Button href={uploadHref} variant="secondary" size="medium" className="relative">
            {t.eventPage.bestPhotoAwards.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
