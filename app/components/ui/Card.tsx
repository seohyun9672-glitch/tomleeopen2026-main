"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "./Button";

// ─── Shared ────────────────────────────────────────────────────────────────────

const LINK_FOCUS_CLASS =
  "block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]";

const PLACEHOLDER_STYLE = {
  backgroundImage: `
    linear-gradient(45deg, var(--card-placeholder-stripe) 25%, transparent 25%),
    linear-gradient(-45deg, var(--card-placeholder-stripe) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--card-placeholder-stripe) 75%),
    linear-gradient(-45deg, transparent 75%, var(--card-placeholder-stripe) 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
  backgroundColor: "var(--card-placeholder-fill)",
} as const;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}


// ─── PhotoStackIcon (media variant only) ──────────────────────────────────────

function PhotoStackIcon() {
  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-surface-card)_40%,transparent)] text-[var(--color-text-on-brand)] ring-1 ring-[color:color-mix(in_srgb,var(--color-text-on-brand)_70%,transparent)] backdrop-blur-[1px]"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "var(--media-thumb-filter)" }}
      >
        <rect x={3.5} y={9.5} width={13} height={9} rx={1.25} />
        <rect x={6.5} y={5.5} width={13} height={9} rx={1.25} />
      </svg>
    </div>
  );
}

// ─── CardProps ─────────────────────────────────────────────────────────────────

export type CardProps = {
  title?: string;
  /** Element tag for the title. Use "h3" for lesson/coach cards to apply global heading scale. */
  titleTag?: "p" | "h3";
  titleClassName?: string;
  image?: string | null;
  imageAlt?: string;
  label?: string;
  labelClassName?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  ctaAriaLabel?: string;
  href?: string;
  hrefAriaLabel?: string;
  imageOnly?: boolean;
  className?: string;

  /**
   * "media" enables the media-card layout: aspect-video image, stacked body
   * (caption → title → subtitle → subtext), neutral border + shadow styling,
   * and photo-gallery affordances.
   */
  variant?: "default" | "media";
  /** Media variant: small outlet/source label above the title. */
  caption?: string | null;
  /** Media variant: descriptive text below the title (articles only). */
  subtitle?: string | null;
  /** Media variant: tiny tertiary text below the subtitle (date). */
  subtext?: string | null;
  /** Media variant: placeholder text when no cover image is available. */
  noImageLabel?: string;
  /** Media variant: number of photos in gallery; >= 2 shows stack badge. */
  photoCount?: number;
  /** Media variant: wraps the cover image in an external link (photo without gallery). */
  coverLinkHref?: string | null;
  /** Media variant: wraps the cover image in a button (gallery open). */
  onImageClick?: (() => void) | null;
};

// ─── Card (default variant) ────────────────────────────────────────────────────

export function Card({
  title,
  titleTag = "p",
  titleClassName,
  image,
  imageAlt,
  label,
  labelClassName = "text-[var(--card-label-lesson)]",
  cta,
  ctaAriaLabel,
  href,
  hrefAriaLabel,
  imageOnly = false,
  className,
  variant = "default",
  caption,
  subtitle,
  subtext,
  noImageLabel,
  photoCount,
  coverLinkHref,
  onImageClick,
}: CardProps) {
  if (variant === "media") {
    return (
      <MediaVariant
        image={image}
        imageAlt={imageAlt ?? title}
        title={title}
        caption={caption}
        subtitle={subtitle}
        subtext={subtext}
        noImageLabel={noImageLabel}
        photoCount={photoCount ?? 0}
        coverLinkHref={coverLinkHref ?? null}
        onImageClick={onImageClick ?? null}
        cta={cta}
        ctaAriaLabel={ctaAriaLabel}
        className={className}
      />
    );
  }

  const alt = imageAlt ?? title ?? "Card";
  const outerLink = imageOnly && !!href;
  const isInternalHref = Boolean(href?.startsWith("/"));
  const showFooter = !imageOnly && !!(title || label || cta);

  const cardBody = (
    <article
      className={joinClasses(
        "flex w-full min-w-0 flex-col overflow-hidden border border-[color:var(--outline-blue-soft)] bg-white transition-colors hover:border-[color:var(--color-primary-blue-300)]",
        imageOnly && "h-[100px] md:h-[150px]",
        !outerLink && className
      )}
    >
      <div
        className={joinClasses(
          "relative w-full bg-[var(--card-placeholder-fill)]",
          imageOnly ? "h-full flex-1" : "h-[220px] md:h-[280px] shrink-0"
        )}
      >
        {image ? (
          <Image
            src={image}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="h-full w-full opacity-80" style={PLACEHOLDER_STYLE} aria-hidden />
        )}
      </div>

      {showFooter && (
        <div className="flex flex-col gap-2 border-[color:var(--color-border-card-subtle)] px-3 py-3">
          {(label || title) && (
            <div className="flex flex-row items-center gap-2 min-w-0">
              {label && (
                <h3 className={joinClasses("shrink-0", labelClassName)}>{label}</h3>
              )}
              {title && titleTag === "h3" ? (
                <h3 className={joinClasses("m-0 min-w-0 truncate", titleClassName ?? "text-[var(--foreground-on-light)]")}>
                  {title}
                </h3>
              ) : title ? (
                <p className={joinClasses("break-words text-sm font-medium leading-tight m-0 min-w-0", titleClassName ?? "text-[var(--foreground-on-light)]")}>
                  {title}
                </p>
              ) : null}
            </div>
          )}

          {cta && (
            <Button
              href={cta.href}
              variant="secondary"
              className="w-full"
              aria-label={ctaAriaLabel ?? cta.label}
            >
              {cta.label}
            </Button>
          )}
        </div>
      )}
    </article>
  );

  if (!outerLink || !href) {
    return cardBody;
  }

  return (
    <Link
      href={href}
      target={isInternalHref ? undefined : "_blank"}
      rel={isInternalHref ? undefined : "noopener noreferrer"}
      className={joinClasses(LINK_FOCUS_CLASS, className)}
      aria-label={hrefAriaLabel ?? (title ? `Visit ${title}` : "Visit website")}
    >
      {cardBody}
    </Link>
  );
}

// ─── MediaVariant (internal) ───────────────────────────────────────────────────

type MediaVariantProps = {
  image?: string | null;
  imageAlt?: string;
  title?: string;
  caption?: string | null;
  subtitle?: string | null;
  subtext?: string | null;
  noImageLabel?: string;
  photoCount: number;
  coverLinkHref: string | null;
  onImageClick: (() => void) | null;
  cta?: { label: string; href?: string; onClick?: () => void };
  ctaAriaLabel?: string;
  className?: string;
};

function MediaVariant({
  image,
  imageAlt,
  title = "",
  caption,
  subtitle,
  subtext,
  noImageLabel = "No image",
  photoCount,
  coverLinkHref,
  onImageClick,
  cta,
  ctaAriaLabel,
  className,
}: MediaVariantProps) {
  const showStack = photoCount >= 2;
  const hasCover = image != null;
  const stackCorner = showStack ? <PhotoStackIcon /> : null;

  const imageInner = hasCover ? (
    <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-strong)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image!}
        alt={imageAlt ?? title}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="lazy"
      />
      {stackCorner}
    </div>
  ) : showStack ? (
    <div className="relative flex aspect-video w-full items-center justify-center bg-[var(--color-surface-strong)] px-3 py-2 text-center text-[var(--color-text-tertiary)] text-sm">
      {noImageLabel}
      {stackCorner}
    </div>
  ) : (
    <div className="flex items-center justify-center px-3 py-2 text-[var(--color-text-tertiary)] text-sm">
      {noImageLabel}
    </div>
  );

  const imageBlock = onImageClick ? (
    <button
      type="button"
      onClick={onImageClick}
      className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset-canvas)]"
      aria-label={cta?.label ?? title}
    >
      {imageInner}
    </button>
  ) : coverLinkHref ? (
    <a href={coverLinkHref} target="_blank" rel="noopener noreferrer" className="block w-full">
      {imageInner}
    </a>
  ) : (
    imageInner
  );

  const hasCoverArea = hasCover || showStack;
  const showSubtext = subtext != null && subtext.trim().length > 0 && subtext !== "—";
  const showCta = cta != null && (cta.href != null || cta.onClick != null);

  return (
    <article
      className={joinClasses(
        "min-w-0 overflow-hidden rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className={hasCoverArea ? "bg-[var(--color-surface-strong)]" : "relative bg-[var(--color-surface-strong)] px-3 py-2"}>
        {imageBlock}
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-1.5">
          {caption && caption.trim().length > 0 && (
            <p className="m-0 min-w-0 truncate text-[10px] font-medium leading-tight tracking-wide text-[var(--color-text-secondary)] sm:text-[11px]">
              {caption}
            </p>
          )}
          {title && <h3 className="text-h3 m-0">{title}</h3>}
          {subtitle && subtitle.trim().length > 0 && (
            <p className="text-[var(--color-text-secondary)] line-clamp-2 text-sm">{subtitle}</p>
          )}
          {showSubtext && (
            <p className="m-0 text-[9px] leading-tight tabular-nums text-[var(--color-text-secondary)] sm:text-[10px]">
              {subtext}
            </p>
          )}
          {showCta && (
            cta!.href ? (
              <Button
                href={cta!.href}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="medium"
                className="mt-2 w-full !min-w-0 max-w-full self-stretch justify-center"
                aria-label={ctaAriaLabel ?? cta!.label}
              >
                {cta!.label}
              </Button>
            ) : cta!.onClick ? (
              <Button
                type="button"
                onClick={cta!.onClick}
                variant="secondary"
                size="medium"
                className="mt-2 w-full !min-w-0 max-w-full self-stretch justify-center"
                aria-label={ctaAriaLabel ?? cta!.label}
              >
                {cta!.label}
              </Button>
            ) : null
          )}
        </div>
      </div>
    </article>
  );
}
