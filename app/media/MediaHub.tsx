"use client";

import { useCallback, useMemo, useState } from "react";
import { useTabParam } from "@/lib/hooks/useTabParam";
import type { MediaRecord, PhotoGalleryGroup } from "@/lib/mediaDb";
import type { CategoryRecord } from "@/lib/categories/types";
import type { PhotoGalleriesByYear } from "@/lib/photoGalleryManifest";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import { TabList } from "@/app/components/ui/TabList";
import { MediaContentCard } from "@/app/components/ui/MediaContentCard";
import { useLocale } from "@/lib/locale-context";
import { MEDIA_KO_COPY_BY_ID, MEDIA_OUTLET_LABELS } from "./mediaData";
import { PhotoGalleryLightbox } from "./PhotoGalleryLightbox";
import { extractYouTubeVideoId, youtubeThumbnailHqUrl } from "@/lib/getYouTubeThumbnail";

/** Featured block at top of Videos tab (must match `Media.id` in seed). */
const MEDIA_VIDEO_HIGHLIGHT_ID = "media-video-2025-recap";

const TABS = ["articles", "videos", "photos"] as const;
type Tab = (typeof TABS)[number];

function formatDate(d: Date | string | null | undefined, locale: "en" | "ko"): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const loc = locale === "ko" ? "ko-KR" : "en-CA";
  return date.toLocaleDateString(loc, {
    year: "numeric",
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
  });
}

/** Groups media rows by `tournamentYear`; rows with no year are `orphans` (no section heading). */
function partitionMediaByYear(items: MediaRecord[]): {
  sections: { year: number; items: MediaRecord[] }[];
  orphans: MediaRecord[];
} {
  const byYear = new Map<number, MediaRecord[]>();
  const orphans: MediaRecord[] = [];
  for (const item of items) {
    const y = item.tournamentYear;
    if (y == null) {
      orphans.push(item);
      continue;
    }
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(item);
  }
  const sections = [...byYear.entries()]
    .filter(([, arr]) => arr.length > 0)
    .map(([year, arr]) => ({ year, items: arr }))
    .sort((a, b) => b.year - a.year);
  return { sections, orphans };
}

function resolveLocalizedMediaText(item: MediaRecord, locale: "en" | "ko") {
  const outlet =
    locale === "ko"
      ? item.outlet
        ? (MEDIA_OUTLET_LABELS[item.outlet] ?? item.outlet)
        : null
      : item.outlet ?? null;
  if (locale !== "ko") return { outlet, title: item.title, subtitle: item.subtitle };
  const koCopy = MEDIA_KO_COPY_BY_ID[item.id];
  return {
    outlet,
    title: koCopy?.title ?? item.title,
    subtitle: koCopy?.subtitle ?? item.subtitle,
  };
}

/** When `categoryId` is set, title always comes from the Category table (label / labelKo). */
function resolveMediaTitle(
  item: MediaRecord,
  categoriesById: Map<string, CategoryRecord>,
  locale: "en" | "ko"
): string {
  if (item.categoryId) {
    return categoryLabelForId(categoriesById, item.categoryId, locale);
  }
  return resolveLocalizedMediaText(item, locale).title;
}

type Props = {
  items: MediaRecord[];
  categories: CategoryRecord[];
  photoGalleries?: PhotoGalleryGroup[];
  /** Tournament year (string key) → category id → gallery URLs for lightbox */
  galleriesByYear?: PhotoGalleriesByYear;
};

function isLocalAssetUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

/** Photo tab: omit cards when there is no cover in DB and no files in the category gallery manifest. */
function photoRecordHasDisplayableImages(
  item: MediaRecord,
  categoryGalleryUrls: string[] | undefined
): boolean {
  const hasDbCover = Boolean((item.media ?? "").trim() || (item.image ?? "").trim());
  const hasManifest = Boolean(categoryGalleryUrls && categoryGalleryUrls.length > 0);
  return hasDbCover || hasManifest;
}

/** One card implementation for articles, videos, and photos — shared `MediaContentCard` styling. */
function MediaHubItemCard({
  item,
  categoriesById,
  categoryGalleryUrls,
  onOpenGallery,
}: {
  item: MediaRecord;
  categoriesById: Map<string, CategoryRecord>;
  categoryGalleryUrls?: string[];
  onOpenGallery?: (urls: string[]) => void;
}) {
  const { locale, t } = useLocale();
  const dateStr = formatDate(item.date, locale);
  const text = resolveLocalizedMediaText(item, locale);
  const title = resolveMediaTitle(item, categoriesById, locale);

  const isPhoto = item.type === "photos";
  const youtubeId =
    item.type === "videos" && item.media ? extractYouTubeVideoId(item.media) : null;
  const hasGallery = Boolean(
    isPhoto && categoryGalleryUrls && categoryGalleryUrls.length > 0 && onOpenGallery
  );
  const photoStackBadge = isPhoto && hasGallery && (categoryGalleryUrls?.length ?? 0) >= 2;
  const coverSrc = isPhoto
    ? item.media ?? item.image ?? categoryGalleryUrls?.[0] ?? null
    : item.type === "videos"
      ? item.image ?? (youtubeId ? youtubeThumbnailHqUrl(youtubeId) : null)
      : item.image ?? null;
  const imageLinkHref =
    isPhoto && !hasGallery && coverSrc && !isLocalAssetUrl(coverSrc) ? coverSrc : null;
  const openGallery = hasGallery && categoryGalleryUrls && onOpenGallery
    ? () => onOpenGallery(categoryGalleryUrls)
    : undefined;

  const metaStart =
    item.type === "videos"
      ? t.mediaPage.defaultMetaOutlet
      : isPhoto
        ? text.outlet ?? t.mediaPage.defaultMetaOutlet
        : text.outlet ?? "—";

  const assignedPlaceholder =
    locale === "ko"
      ? item.imagePlaceholderKo?.trim() || item.imagePlaceholder?.trim()
      : item.imagePlaceholder?.trim();
  const noImageLabel =
    assignedPlaceholder && assignedPlaceholder.length > 0 ? assignedPlaceholder : t.mediaPage.noImage;

  return (
    <MediaContentCard
      imageSrc={coverSrc}
      imageAlt={title}
      imageLinkHref={imageLinkHref}
      onCoverClick={openGallery}
      coverAriaLabel={openGallery ? t.mediaPage.viewGallery : undefined}
      noImageLabel={noImageLabel}
      photoStackBadge={photoStackBadge}
      meta={{ start: metaStart, end: dateStr }}
      title={title}
      showSubtitle={!isPhoto}
      subtitle={text.subtitle}
      cta={
        hasGallery && !coverSrc && openGallery
          ? {
              label: t.mediaPage.viewGallery,
              variant: "secondary",
              onClick: openGallery,
            }
          : !isPhoto && item.media
            ? {
                label: t.mediaPage.view,
                variant: "secondary",
                href: item.media,
                target: "_blank",
                rel: "noopener noreferrer",
              }
            : undefined
      }
    />
  );
}

export function MediaHub({
  items,
  categories,
  photoGalleries = [],
  galleriesByYear = {},
}: Props) {
  const { t, locale } = useLocale();
  const tabDefs = TABS.map((tab) => ({ value: tab, label: t.mediaPage.tabs[tab] }));
  const [currentTab, setCurrentTab] = useTabParam(tabDefs);
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const openGallery = useCallback((urls: string[]) => {
    if (urls.length === 0) return;
    setLightbox({ urls, index: 0 });
  }, []);

  const filtered = items.filter((m) => m.type === currentTab);
  const photosWithoutCategory = items.filter(
    (m) => m.type === "photos" && (m.categoryId == null || m.tournamentYear == null)
  );
  const useGalleryByCategory = currentTab === "photos" && photoGalleries.length > 0;

  const galleryUrlsForItem = useCallback(
    (item: MediaRecord) => {
      if (item.type !== "photos" || item.categoryId == null || item.tournamentYear == null) {
        return undefined;
      }
      const yearKey = String(item.tournamentYear);
      return galleriesByYear[yearKey]?.[item.categoryId];
    },
    [galleriesByYear]
  );

  const displayItems: MediaRecord[] = (() => {
    const base =
      currentTab === "photos" && useGalleryByCategory
        ? [...photoGalleries.flatMap((g) => g.items), ...photosWithoutCategory]
        : filtered;
    if (currentTab !== "photos") return base;
    return base.filter((item) => photoRecordHasDisplayableImages(item, galleryUrlsForItem(item)));
  })();

  const photoGridClass =
    "grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 sm:gap-[var(--grid-gap-md)] md:grid-cols-3 lg:grid-cols-4";

  const renderItemCard = (item: MediaRecord) => (
    <MediaHubItemCard
      item={item}
      categoriesById={categoriesById}
      categoryGalleryUrls={galleryUrlsForItem(item)}
      onOpenGallery={openGallery}
    />
  );

  return (
    <div className="flex flex-col gap-[var(--grid-gap)] md:gap-[var(--grid-gap-md)]">
      {lightbox ? (
        <PhotoGalleryLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          closeLabel={t.mediaPage.galleryClose}
          prevLabel={t.mediaPage.galleryPrev}
          nextLabel={t.mediaPage.galleryNext}
        />
      ) : null}
      <TabList
        tabs={tabDefs}
        value={currentTab}
        onSelect={(tab) => setCurrentTab(tab as Tab)}
      />

      <div className="text-[var(--section-text)]">
        {displayItems.length === 0 ? (
          <p className="text-[var(--color-text-tertiary)] text-center py-8 px-4">{t.mediaPage.emptyState}</p>
        ) : currentTab === "articles" ? (
          <ul className={photoGridClass}>
            {displayItems.map((item) => (
              <li key={item.id}>{renderItemCard(item)}</li>
            ))}
          </ul>
        ) : currentTab === "photos" ? (
          (() => {
            const { sections, orphans } = partitionMediaByYear(displayItems);
            return (
              <div className="flex flex-col gap-[var(--grid-gap-md)]">
                {sections.map(({ year, items }) => (
                  <section
                    key={year}
                    aria-labelledby={`media-photos-year-${year}`}
                    className="h3-card-stack"
                  >
                    <h2 id={`media-photos-year-${year}`} className="text-h2 m-0 text-[var(--color-text-primary)]">
                      {t.mediaPage.finalYearSectionTitle(year)}
                    </h2>
                    <ul className={photoGridClass}>
                      {items.map((item) => (
                        <li key={item.id}>{renderItemCard(item)}</li>
                      ))}
                    </ul>
                  </section>
                ))}
                {orphans.length > 0 ? (
                  <ul className={photoGridClass}>
                    {orphans.map((item) => (
                      <li key={item.id}>{renderItemCard(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })()
        ) : currentTab === "videos" ? (
          (() => {
            const itemsForVideoPartition = displayItems.map((item) =>
              item.id === MEDIA_VIDEO_HIGHLIGHT_ID && item.tournamentYear == null
                ? { ...item, tournamentYear: 2025 }
                : item
            );
            const { sections, orphans } = partitionMediaByYear(itemsForVideoPartition);
            const highlight = itemsForVideoPartition.find((m) => m.id === MEDIA_VIDEO_HIGHLIGHT_ID);
            const highlightEffectiveYear =
              highlight != null ? (highlight.tournamentYear ?? 2025) : null;

            return (
              <div className="flex flex-col gap-[var(--grid-gap-md)]">
                {sections.map(({ year, items }) => {
                  const showFeatured =
                    highlight != null &&
                    highlightEffectiveYear === year &&
                    items.some((m) => m.id === MEDIA_VIDEO_HIGHLIGHT_ID);
                  const highlightYoutubeId =
                    showFeatured && highlight?.media
                      ? extractYouTubeVideoId(highlight.media)
                      : null;
                  const highlightTitle =
                    showFeatured && highlight != null
                      ? resolveMediaTitle(highlight, categoriesById, locale)
                      : "";
                  const gridItems = showFeatured
                    ? items.filter((m) => m.id !== MEDIA_VIDEO_HIGHLIGHT_ID)
                    : items;

                  return (
                    <div key={year} className="flex flex-col gap-[var(--grid-gap)] md:gap-[var(--grid-gap-md)]">
                      {showFeatured ? (
                        <div className="overflow-hidden rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] p-[var(--content-gap)] shadow-md md:p-[var(--section-gap)]">
                          <div
                            className={`grid grid-cols-1 gap-[var(--grid-gap)] sm:gap-[var(--grid-gap-md)] ${highlightYoutubeId ? "sm:grid-cols-2 sm:items-center" : ""}`}
                          >
                            {highlightYoutubeId ? (
                              <div className="min-w-0">
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--color-surface-strong)]">
                                  <iframe
                                    className="absolute inset-0 h-full w-full border-0"
                                    src={`https://www.youtube.com/embed/${highlightYoutubeId}?rel=0`}
                                    title={highlightTitle}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  />
                                </div>
                              </div>
                            ) : null}
                            <div
                              className={`flex min-w-0 flex-col justify-center gap-[var(--element-gap)] ${highlightYoutubeId ? "" : "max-w-2xl"}`}
                            >
                              <h2 className="text-h2 m-0 text-[var(--color-text-primary)]">{highlightTitle}</h2>
                              <p className="text-body m-0 text-[var(--text-secondary)]">
                                {t.mediaPage.featuredVideoDescription}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {gridItems.length > 0 ? (
                        <section
                          aria-labelledby={`media-videos-year-${year}`}
                          className="h3-card-stack"
                        >
                          <h2 id={`media-videos-year-${year}`} className="text-h2 m-0 text-[var(--color-text-primary)]">
                            {t.mediaPage.finalYearSectionTitle(year)}
                          </h2>
                          <ul className={photoGridClass}>
                            {gridItems.map((item) => (
                              <li key={item.id}>{renderItemCard(item)}</li>
                            ))}
                          </ul>
                        </section>
                      ) : null}
                    </div>
                  );
                })}
                {orphans.length > 0 ? (
                  <ul className={photoGridClass}>
                    {orphans.map((item) => (
                      <li key={item.id}>{renderItemCard(item)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })()
        ) : null}
      </div>
    </div>
  );
}
