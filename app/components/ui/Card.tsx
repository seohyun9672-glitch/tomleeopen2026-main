import Image from "next/image";
import Link from "next/link";
import { Button } from "./Button";

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

export type CardProps = {
  title?: string;
  /** Element tag for the title. Use "h3" for lesson/coach cards to apply global heading scale. */
  titleTag?: "p" | "h3";
  titleClassName?: string;
  image?: string | null;
  imageAlt?: string;
  label?: string;
  labelClassName?: string;
  cta?: { label: string; href: string };
  ctaAriaLabel?: string;
  href?: string;
  hrefAriaLabel?: string;
  imageOnly?: boolean;
  className?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
}: CardProps) {
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
                <span className={joinClasses("shrink-0", labelClassName)}>{label}</span>
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