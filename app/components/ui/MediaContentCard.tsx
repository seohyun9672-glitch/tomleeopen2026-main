import Image from "next/image";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button";

export type MediaContentCardTitleStyle = "default" | "compact";

export type MediaContentCardProps = {
  /** Cover image URL (local `/…` or remote `https://`). */
  imageSrc: string | null;
  imageAlt: string;
  /** When set, the image area is wrapped in a link (e.g. external photo URL). */
  imageLinkHref?: string | null;
  /** When set (e.g. open lightbox), cover is a button; takes precedence over `imageLinkHref`. */
  onCoverClick?: () => void;
  /** `aria-label` for the cover button (when `onCoverClick` is set). */
  coverAriaLabel?: string;
  /** Shown when `imageSrc` is missing. */
  noImageLabel: string;
  /** Top row shows `start` only; `end` is rendered as the date line below the subtitle. */
  meta?: { start: string; end: string } | null;
  title: string;
  /** `default` uses global `text-h3`; `compact` for dense grids (e.g. photo galleries). */
  titleStyle?: MediaContentCardTitleStyle;
  /** When false, subtitle block is not rendered even if `subtitle` is set. */
  showSubtitle?: boolean;
  subtitle?: string | null;
  /** Typography for subtitle (default matches articles/videos). */
  subtitleSize?: "sm" | "xs";
  /** Extra date line after meta date (e.g. photos); omit if `meta.end` already carries the date. */
  footerDate?: string | null;
  /** Multi-photo gallery hint: stacked-frames chip bottom-right (translucent white bg, white icon). */
  photoStackBadge?: boolean;
  /** Optional CTA under the text stack. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: ButtonVariant;
    iconRight?: React.ReactNode;
    target?: string;
    rel?: string;
  };
  className?: string;
  contentPadding?: "md" | "sm";
};

function isLocalAssetUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function PhotoStackCornerIcon() {
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

/**
 * Shared media hub card: image band + outlet row, title, subtitle, date (from meta.end), optional footer date, CTA.
 * Used for Articles, Videos, and Photos with visibility controlled via props.
 */
export function MediaContentCard({
  imageSrc,
  imageAlt,
  imageLinkHref,
  onCoverClick,
  coverAriaLabel,
  noImageLabel,
  meta,
  title,
  titleStyle = "default",
  showSubtitle = true,
  subtitle,
  subtitleSize = "sm",
  footerDate,
  photoStackBadge = false,
  cta,
  className = "",
  contentPadding = "md",
}: MediaContentCardProps) {
  const pad = contentPadding === "sm" ? "p-3" : "p-4";
  const showMetaStartRow = meta != null && meta.start.trim().length > 0;
  const showMetaDate =
    meta != null && meta.end.trim().length > 0 && meta.end !== "—";
  const subtitleText = showSubtitle && subtitle?.trim() ? subtitle.trim() : null;
  const showFooterDate = Boolean(footerDate?.trim());

  /**
   * YouTube `hqdefault` (and similar) is often 4:3 with letterboxed black bars for 16:9 video.
   * A fixed 16:9 frame + cover crops those bars; `object-center` keeps the subject centered.
   */
  const stackCorner = photoStackBadge ? <PhotoStackCornerIcon /> : null;
  const imageInner =
    imageSrc != null && imageSrc !== "" ? (
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--color-surface-strong)]">
        {isLocalAssetUrl(imageSrc) ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        )}
        {stackCorner}
      </div>
    ) : photoStackBadge ? (
      <div className="relative flex aspect-video w-full items-center justify-center bg-[var(--color-surface-strong)] px-3 py-2 text-center text-[var(--color-text-tertiary)] text-sm">
        {noImageLabel}
        {stackCorner}
      </div>
    ) : (
      <div className="flex items-center justify-center px-3 py-2 text-[var(--color-text-tertiary)] text-sm">{noImageLabel}</div>
    );

  const imageBlock =
    onCoverClick != null ? (
      <button
        type="button"
        onClick={onCoverClick}
        className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset-canvas)]"
        aria-label={coverAriaLabel ?? imageAlt}
      >
        {imageInner}
      </button>
    ) : imageLinkHref != null && imageLinkHref !== "" ? (
      <a
        href={imageLinkHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {imageInner}
      </a>
    ) : (
      imageInner
    );

  const hasImage = imageSrc != null && imageSrc !== "";
  const coverUsesAspectBand = hasImage || photoStackBadge;

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-xl border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] shadow-sm transition-shadow hover:shadow-md ${className}`.trim()}
    >
      <div className={coverUsesAspectBand ? "bg-[var(--color-surface-strong)]" : "relative bg-[var(--color-surface-strong)] px-3 py-2"}>
        {imageBlock}
      </div>
      <div className={pad}>
        <div className="flex flex-col gap-1.5">
          {showMetaStartRow && meta ? (
            <p className="m-0 min-w-0 truncate text-[10px] font-medium leading-tight tracking-wide text-[var(--color-text-secondary)] sm:text-[11px]">
              {meta.start}
            </p>
          ) : null}
          {titleStyle === "default" ? (
            <h3 className="text-h3 m-0">{title}</h3>
          ) : (
            <h3 className="m-0 line-clamp-1 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
          )}
          {subtitleText ? (
            <p
              className={`text-[var(--color-text-secondary)] line-clamp-2 ${subtitleSize === "xs" ? "text-xs" : "text-sm"}`.trim()}
            >
              {subtitleText}
            </p>
          ) : null}
          {showMetaDate && meta ? (
            <p className="m-0 text-[9px] leading-tight tabular-nums text-[var(--color-text-secondary)] sm:text-[10px]">
              {meta.end}
            </p>
          ) : null}
          {showFooterDate ? (
            <p className="m-0 text-[9px] leading-tight tabular-nums text-[var(--color-text-secondary)] sm:text-[10px]">{footerDate}</p>
          ) : null}
          {cta ? (
            cta.href ? (
              <Button
                href={cta.href}
                target={cta.target}
                rel={cta.rel}
                variant={cta.variant ?? "secondary"}
                iconRight={cta.iconRight}
                size="medium"
                className="mt-2 w-full !min-w-0 max-w-full self-stretch justify-center"
              >
                {cta.label}
              </Button>
            ) : cta.onClick ? (
              <Button
                type="button"
                onClick={cta.onClick}
                variant={cta.variant ?? "secondary"}
                iconRight={cta.iconRight}
                size="medium"
                className="mt-2 w-full !min-w-0 max-w-full self-stretch justify-center"
              >
                {cta.label}
              </Button>
            ) : null
          ) : null}
        </div>
      </div>
    </article>
  );
}
