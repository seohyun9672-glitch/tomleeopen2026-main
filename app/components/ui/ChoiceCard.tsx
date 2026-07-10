"use client";

import { cn } from "@/lib/utils";
import { Chip } from "./Chip";

export type ChoiceCardProps = {
  label: string;
  sublabel?: string;
  showImage?: boolean;
  imageSrc?: string;
  badge?: string;
  badgeClassName?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "horizontal" | "vertical";
  displayOnly?: boolean;
};

export function ChoiceCard({
  label,
  sublabel,
  showImage = false,
  imageSrc,
  badge,
  badgeClassName,
  selected,
  disabled = false,
  onClick,
  variant = "horizontal",
  displayOnly = false,
}: ChoiceCardProps) {
  if (variant === "vertical") {
    const Tag = displayOnly ? "div" : "button";
    return (
      <Tag
        {...(!displayOnly ? {
          type: "button" as const,
          onClick: disabled ? undefined : onClick,
          disabled,
          "aria-pressed": selected,
        } : {})}
        className={cn(
          "flex flex-col w-full text-left rounded-xl border overflow-hidden transition-colors select-none",
          selected
            ? "border-[var(--color-primary-blue-500)] bg-[var(--color-surface-muted)]"
            : "border-[var(--color-border-ui)] bg-[var(--color-surface-card)]",
          !displayOnly && !disabled && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
          !displayOnly && disabled && "opacity-60 cursor-not-allowed",
          displayOnly && "cursor-default",
        )}
      >
        {/* Top row: radio + badge */}
        {!displayOnly && (
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span
              className={cn(
                "shrink-0 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                selected
                  ? "border-[var(--color-primary-blue-500)]"
                  : "border-[var(--color-border-ui-strong)]",
              )}
              aria-hidden
            >
              {selected && (
                <span className="h-2 w-2 rounded-full bg-[var(--color-primary-blue-500)]" />
              )}
            </span>
            {badge && (
              <Chip label={badge} size="sm" className={cn("shrink-0", badgeClassName)} />
            )}
          </div>
        )}

        {/* Image */}
        {showImage && (
          <div className="w-full aspect-square bg-[var(--color-surface-muted)]">
            {imageSrc ? (
              <img src={imageSrc} alt={label} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" aria-hidden />
            )}
          </div>
        )}

        {/* Label + sublabel */}
        <div className="px-3 py-2.5 flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
          {sublabel && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sublabel}</p>
          )}
        </div>
      </Tag>
    );
  }

  // horizontal (default)
  const Tag = displayOnly ? "div" : "button";
  return (
    <Tag
      {...(!displayOnly ? {
        type: "button" as const,
        onClick: disabled ? undefined : onClick,
        disabled,
        "aria-pressed": selected,
      } : {})}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 text-left transition-colors select-none",
        selected
          ? "bg-[var(--color-surface-muted)]"
          : "bg-[var(--color-surface-card)]",
        !displayOnly && !disabled && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
        !displayOnly && disabled && "opacity-60 cursor-not-allowed",
        displayOnly && "cursor-default",
      )}
    >
      {/* Radio indicator */}
      {!displayOnly && (
        <span
          className={cn(
            "shrink-0 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-[var(--color-primary-blue-500)]"
              : "border-[var(--color-border-ui-strong)]",
          )}
          aria-hidden
        >
          {selected && (
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary-blue-500)]" />
          )}
        </span>
      )}

      {showImage && (
        <div className="h-20 w-20 shrink-0 rounded overflow-hidden bg-[var(--color-surface-muted)]">
          {imageSrc ? (
            <img src={imageSrc} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" aria-hidden />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{label}</p>
        {sublabel && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sublabel}</p>
        )}
      </div>

      {!displayOnly && badge && (
        <Chip label={badge} size="sm" className={cn("shrink-0", badgeClassName)} />
      )}
    </Tag>
  );
}
