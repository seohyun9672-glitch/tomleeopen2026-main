"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { useTabParam } from "@/lib/hooks/useTabParam";
import type { MediaRecord } from "@/lib/media";
import type { CategoryRecord } from "@/lib/categories";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories";
import { TabList } from "@/app/components/ui/TabList";
import { DatabaseLayout } from "@/app/components/database";
import { Card } from "@/app/components/ui/Card";
import { useLocale } from "@/lib/locale-context";
import { PhotoGalleryLightbox } from "./PhotoGalleryLightbox";
import { extractYouTubeVideoId, youtubeThumbnailHqUrl } from "@/lib/media";

const VIDEO_HIGHLIGHT_ID = "media-video-2025-recap";
const VIDEO_FALLBACK_YEAR = 2025;

const TABS = ["videos", "photos", "articles"] as const;
type Tab = (typeof TABS)[number];

const cardGridClass =
  "grid grid-cols-1 gap-[var(--grid-gap)] sm:grid-cols-2 sm:gap-[var(--grid-gap-md)] md:grid-cols-3 lg:grid-cols-4";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const v of values) {
    if (v != null && v.trim().length > 0) return v;
  }
  return null;
}

function formatDate(
  d: Date | string | null | undefined,
  locale: "en" | "ko",
): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-CA", {
    year: "numeric",
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
  });
}

function partitionByYear(items: MediaRecord[]): {
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

function resolveLocalizedText(item: MediaRecord, locale: "en" | "ko") {
  if (locale !== "ko") {
    return {
      outlet: item.outlet ?? null,
      title: item.title,
      subtitle: item.subtitle,
    };
  }
  return {
    outlet: item.outletKo ?? item.outlet ?? null,
    title: item.titleKo ?? item.title,
    subtitle: item.subtitleKo ?? item.subtitle,
  };
}

function resolveItemTitle(
  item: MediaRecord,
  categoriesById: Map<string, CategoryRecord>,
  locale: "en" | "ko",
): string {
  if (item.categoryId)
    return categoryLabelForId(categoriesById, item.categoryId, locale);
  return resolveLocalizedText(item, locale).title;
}

function buildManifestItems(
  photoManifests: Record<number, Record<string, string[]>>,
): MediaRecord[] {
  const result: MediaRecord[] = [];
  for (const [yearStr, catMap] of Object.entries(photoManifests)) {
    const year = Number(yearStr);
    for (const [categoryId, urls] of Object.entries(catMap)) {
      if (urls.length === 0) continue;
      result.push({
        id: `manifest-${year}-${categoryId}`,
        type: "photos",
        title: categoryId,
        titleKo: null,
        subtitle: null,
        subtitleKo: null,
        date: null,
        image: urls[0],
        imagePlaceholder: null,
        imagePlaceholderKo: null,
        media: urls[0],
        outlet: null,
        outletKo: null,
        sortOrder: 0,
        categoryId,
        tournamentYear: year,
      });
    }
  }
  return result;
}

function hasDisplayableImage(
  item: MediaRecord,
  galleryUrls: string[] | undefined,
): boolean {
  return (
    firstNonEmpty(item.media, item.image) != null ||
    (galleryUrls?.length ?? 0) > 0
  );
}

// ─── Card props builder ───────────────────────────────────────────────────────

type CardBuildOpts = {
  categoriesById: Map<string, CategoryRecord>;
  locale: "en" | "ko";
  defaultMetaOutlet: string;
  viewGalleryLabel: string;
  viewLabel: string;
  noImageFallback: string;
  onOpenGallery: ((urls: string[]) => void) | null;
};

type MediaCardProps = {
  image: string | null;
  caption: string | null;
  title: string;
  subtitle: string | null;
  subtext: string | null;
  noImageLabel: string;
  photoCount: number;
  coverLinkHref: string | null;
  onImageClick: (() => void) | null;
  cta: { label: string; href?: string; onClick?: () => void } | undefined;
};

function buildCardProps(
  item: MediaRecord,
  galleryUrls: string[] | undefined,
  opts: CardBuildOpts,
): MediaCardProps {
  const {
    categoriesById,
    locale,
    defaultMetaOutlet,
    viewGalleryLabel,
    viewLabel,
    noImageFallback,
    onOpenGallery,
  } = opts;

  const isPhoto = item.type === "photos";
  const isVideo = item.type === "videos";
  const text = resolveLocalizedText(item, locale);

  const youtubeId =
    isVideo && item.media ? extractYouTubeVideoId(item.media) : null;
  const hasGallery = Boolean(
    isPhoto && galleryUrls && galleryUrls.length > 0 && onOpenGallery,
  );
  const photoCount = hasGallery ? (galleryUrls?.length ?? 0) : 0;

  const image = firstNonEmpty(
    isPhoto
      ? firstNonEmpty(item.media, item.image, galleryUrls?.[0])
      : isVideo
        ? firstNonEmpty(
            item.image,
            youtubeId ? youtubeThumbnailHqUrl(youtubeId) : null,
          )
        : item.image,
  );

  const coverLinkHref =
    isPhoto && !hasGallery && image && !image.startsWith("/") ? image : null;

  const caption: string | null = isVideo
    ? defaultMetaOutlet
    : firstNonEmpty(text.outlet, isPhoto ? defaultMetaOutlet : null);

  const subtitle = !isPhoto ? firstNonEmpty(text.subtitle) : null;

  const subtext = (() => {
    if (isVideo || isPhoto) return null;
    const d = formatDate(item.date, locale);
    return d !== "—" ? d : null;
  })();

  const noImageLabel =
    firstNonEmpty(
      locale === "ko" ? item.imagePlaceholderKo : null,
      item.imagePlaceholder,
      noImageFallback,
    ) ?? noImageFallback;

  const onImageClick =
    hasGallery && galleryUrls && onOpenGallery
      ? () => onOpenGallery(galleryUrls)
      : null;

  const galleryNoCover = hasGallery && !image;
  const cta: MediaCardProps["cta"] = galleryNoCover
    ? { label: viewGalleryLabel, onClick: () => onOpenGallery!(galleryUrls!) }
    : !isPhoto && item.media
      ? { label: viewLabel, href: item.media }
      : undefined;

  return {
    image,
    caption,
    title: resolveItemTitle(item, categoriesById, locale),
    subtitle,
    subtext,
    noImageLabel,
    photoCount,
    coverLinkHref,
    onImageClick,
    cta,
  };
}

// ─── Shared card renderer ─────────────────────────────────────────────────────

function MediaCardItem({
  item,
  galleryUrls,
  opts,
}: {
  item: MediaRecord;
  galleryUrls: string[] | undefined;
  opts: CardBuildOpts;
}) {
  const p = buildCardProps(item, galleryUrls, opts);
  return (
    <Card
      variant="media"
      image={p.image}
      caption={p.caption}
      title={p.title}
      subtitle={p.subtitle}
      subtext={p.subtext}
      noImageLabel={p.noImageLabel}
      photoCount={p.photoCount}
      coverLinkHref={p.coverLinkHref}
      onImageClick={p.onImageClick}
      cta={p.cta}
    />
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function YearSection({
  sectionId,
  heading,
  capText,
  children,
}: {
  sectionId: string;
  heading: string;
  capText?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={sectionId}
      className="flex flex-col gap-[var(--content-gap)]"
    >
      <h2 id={sectionId} className="text-h2 m-0 text-[var(--color-text-primary)]">
        {heading}
      </h2>
      {capText && (
        <p className="text-body m-0 text-[var(--text-secondary)]">{capText}</p>
      )}
      {children}
    </section>
  );
}

// ─── Featured video embed ─────────────────────────────────────────────────────

function FeaturedVideoBlock({
  youtubeId,
  title,
  description,
}: {
  youtubeId: string | null;
  title: string;
  description: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] p-[var(--content-gap)] shadow-md md:p-[var(--section-gap)]">
      <div
        className={`grid grid-cols-1 gap-[var(--grid-gap)] sm:gap-[var(--grid-gap-md)] ${youtubeId ? "sm:grid-cols-2 sm:items-center" : ""}`}
      >
        {youtubeId && (
          <div className="min-w-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--color-surface-strong)]">
              <iframe
                className="absolute inset-0 h-full w-full border-0"
                src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        )}
        <div
          className={`flex min-w-0 flex-col justify-center gap-[var(--element-gap)] ${youtubeId ? "" : "max-w-2xl"}`}
        >
          <h2 className="text-h2 m-0 text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-body m-0 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab content components ───────────────────────────────────────────────────

type ContentProps = {
  items: MediaRecord[];
  cardOpts: CardBuildOpts;
  galleryUrlsForItem: (item: MediaRecord) => string[] | undefined;
};

type SectionedContentProps = ContentProps & {
  finalYearSectionTitle: (year: number) => string;
};

function ArticlesContent({
  items,
  cardOpts,
  galleryUrlsForItem,
}: ContentProps) {
  return (
    <ul className={cardGridClass}>
      {items.map((item) => (
        <li key={item.id}>
          <MediaCardItem
            item={item}
            galleryUrls={galleryUrlsForItem(item)}
            opts={cardOpts}
          />
        </li>
      ))}
    </ul>
  );
}

function PhotosContent({
  items,
  cardOpts,
  galleryUrlsForItem,
  finalYearSectionTitle,
}: SectionedContentProps) {
  const { sections, orphans } = useMemo(() => partitionByYear(items), [items]);

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {sections.map(({ year, items: sectionItems }, index) => (
        <Fragment key={year}>
          {index > 0 && (
            <hr className="m-0 border-t border-[color:var(--color-border-ui)]" />
          )}
          <YearSection
            sectionId={`media-photos-year-${year}`}
            heading={finalYearSectionTitle(year)}
          >
            <ul className={cardGridClass}>
              {sectionItems.map((item) => (
                <li key={item.id}>
                  <MediaCardItem
                    item={item}
                    galleryUrls={galleryUrlsForItem(item)}
                    opts={cardOpts}
                  />
                </li>
              ))}
            </ul>
          </YearSection>
        </Fragment>
      ))}
      {orphans.length > 0 && (
        <ul className={cardGridClass}>
          {orphans.map((item) => (
            <li key={item.id}>
              <MediaCardItem
                item={item}
                galleryUrls={galleryUrlsForItem(item)}
                opts={cardOpts}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VideosContent({
  items,
  cardOpts,
  galleryUrlsForItem,
  finalYearSectionTitle,
  featuredVideoDescription,
}: SectionedContentProps & { featuredVideoDescription: string }) {
  const { categoriesById, locale } = cardOpts;

  const itemsForPartition = useMemo(
    () =>
      items.map((item) =>
        item.id === VIDEO_HIGHLIGHT_ID && item.tournamentYear == null
          ? { ...item, tournamentYear: VIDEO_FALLBACK_YEAR }
          : item,
      ),
    [items],
  );

  const { sections, orphans } = useMemo(
    () => partitionByYear(itemsForPartition),
    [itemsForPartition],
  );

  const highlight = useMemo(
    () => itemsForPartition.find((m) => m.id === VIDEO_HIGHLIGHT_ID) ?? null,
    [itemsForPartition],
  );

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {sections.map(({ year, items: sectionItems }, index) => {
        const highlightEffectiveYear =
          highlight?.tournamentYear ?? VIDEO_FALLBACK_YEAR;
        const showFeatured =
          highlight != null &&
          highlightEffectiveYear === year &&
          sectionItems.some((m) => m.id === VIDEO_HIGHLIGHT_ID);
        const highlightYoutubeId =
          showFeatured && highlight?.media
            ? extractYouTubeVideoId(highlight.media)
            : null;
        const highlightTitle =
          showFeatured && highlight != null
            ? resolveItemTitle(highlight, categoriesById, locale)
            : "";
        const gridItems = showFeatured
          ? sectionItems.filter((m) => m.id !== VIDEO_HIGHLIGHT_ID)
          : sectionItems;

        return (
          <Fragment key={year}>
            {index > 0 && (
              <hr className="m-0 border-t border-[color:var(--color-border-ui)]" />
            )}
            {showFeatured && (
              <FeaturedVideoBlock
                youtubeId={highlightYoutubeId}
                title={highlightTitle}
                description={featuredVideoDescription}
              />
            )}
            <YearSection
              sectionId={`media-videos-year-${year}`}
              heading={finalYearSectionTitle(year)}
            >
              {gridItems.length > 0 && (
                <ul className={cardGridClass}>
                  {gridItems.map((item) => (
                    <li key={item.id}>
                      <MediaCardItem
                        item={item}
                        galleryUrls={galleryUrlsForItem(item)}
                        opts={cardOpts}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </YearSection>
          </Fragment>
        );
      })}
      {orphans.length > 0 && (
        <ul className={cardGridClass}>
          {orphans.map((item) => (
            <li key={item.id}>
              <MediaCardItem
                item={item}
                galleryUrls={galleryUrlsForItem(item)}
                opts={cardOpts}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── MediaHub ─────────────────────────────────────────────────────────────────

type Props = {
  items: MediaRecord[];
  categories: CategoryRecord[];
  photoManifests?: Record<number, Record<string, string[]>>;
};

export function MediaHub({ items, categories, photoManifests }: Props) {
  const { t, locale } = useLocale();

  const tabDefs = TABS.map((tab) => ({
    value: tab,
    label: t.mediaPage.tabs[tab],
  }));
  const [currentTab, setCurrentTab] = useTabParam(tabDefs);

  const categoriesById = useMemo(
    () => buildCategoryByIdMap(categories),
    [categories],
  );

  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const openGallery = useCallback((urls: string[]) => {
    if (urls.length === 0) return;
    setLightbox({ urls, index: 0 });
  }, []);

  const manifestItems = useMemo(
    () => (photoManifests ? buildManifestItems(photoManifests) : []),
    [photoManifests],
  );

  const galleryUrlsForItem = useCallback(
    (item: MediaRecord): string[] | undefined => {
      if (!item.categoryId || !item.tournamentYear || !photoManifests)
        return undefined;
      const urls = photoManifests[item.tournamentYear]?.[item.categoryId];
      return urls && urls.length > 0 ? urls : undefined;
    },
    [photoManifests],
  );

  const displayItems = useMemo<MediaRecord[]>(() => {
    if (currentTab === "photos") {
      const orphans = items.filter(
        (m) =>
          m.type === "photos" &&
          (m.categoryId == null || m.tournamentYear == null),
      );
      const base =
        manifestItems.length > 0
          ? [...manifestItems, ...orphans]
          : items.filter((m) => m.type === "photos");
      return base.filter((item) =>
        hasDisplayableImage(item, galleryUrlsForItem(item)),
      );
    }
    return items.filter((m) => m.type === currentTab);
  }, [items, currentTab, manifestItems, galleryUrlsForItem]);

  const cardOpts = useMemo<CardBuildOpts>(
    () => ({
      categoriesById,
      locale,
      defaultMetaOutlet: t.mediaPage.defaultMetaOutlet,
      viewGalleryLabel: t.mediaPage.viewGallery,
      viewLabel: t.mediaPage.view,
      noImageFallback: t.mediaPage.noImage,
      onOpenGallery: openGallery,
    }),
    [categoriesById, locale, t.mediaPage, openGallery],
  );

  function renderContent() {
    switch (currentTab) {
      case "articles":
        return (
          <ArticlesContent
            items={displayItems}
            cardOpts={cardOpts}
            galleryUrlsForItem={galleryUrlsForItem}
          />
        );
      case "photos":
        return (
          <PhotosContent
            items={displayItems}
            cardOpts={cardOpts}
            galleryUrlsForItem={galleryUrlsForItem}
            finalYearSectionTitle={t.mediaPage.finalYearSectionTitle}
          />
        );
      case "videos":
        return (
          <VideosContent
            items={displayItems}
            cardOpts={cardOpts}
            galleryUrlsForItem={galleryUrlsForItem}
            finalYearSectionTitle={t.mediaPage.finalYearSectionTitle}
            featuredVideoDescription={t.mediaPage.featuredVideoDescription}
          />
        );
    }
  }

  return (
    <>
      {lightbox && (
        <PhotoGalleryLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          closeLabel={t.mediaPage.galleryClose}
          prevLabel={t.mediaPage.galleryPrev}
          nextLabel={t.mediaPage.galleryNext}
        />
      )}
      <div className="flex flex-col gap-[var(--grid-gap)] md:gap-[var(--grid-gap-md)]">
        <TabList
          tabs={tabDefs}
          value={currentTab}
          onSelect={(tab) => setCurrentTab(tab as Tab)}
        />
        <DatabaseLayout
          isEmpty={displayItems.length === 0}
          emptyText={t.mediaPage.emptyState}
          className="text-[var(--section-text)]"
        >
          {renderContent()}
        </DatabaseLayout>
      </div>
    </>
  );
}
