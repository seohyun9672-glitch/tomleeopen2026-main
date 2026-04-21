"use client";

import { IconButton } from "@/app/components/ui/Button";

type StageHeaderNav = {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel: string;
  nextLabel: string;
};

type StageHeaderProps = {
  title: string;
  className?: string;
  /** Shown on small screens only. */
  navigation?: StageHeaderNav;
};

type NavDirection = "prev" | "next";

type NavButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  direction: NavDirection;
};

const ROOT_CLASS =
  "tournament-tree-stage-header flex shrink-0 items-center justify-center gap-1 overflow-hidden px-1 py-2 md:px-2 md:py-2.5";

const NAV_BUTTON_CLASS = "h-9 w-9 shrink-0 md:hidden";

const TITLE_CLASS =
  "m-0 min-w-0 flex-1 text-center text-[var(--color-text-primary)]";

const TITLE_STYLE = {
  display: "block",
  fontFamily: "var(--text-h3-font)",
  fontWeight: "var(--text-h3-weight)",
  fontSize: "var(--text-h3-display-size)",
  letterSpacing: "var(--text-h3-letter-spacing)",
  lineHeight: "var(--text-h3-line-height)",
} as const;

const CHEVRON_PATH_BY_DIRECTION: Record<NavDirection, string> = {
  prev: "M15 19l-7-7 7-7",
  next: "M9 5l7 7-7 7",
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Column title for the tournament bracket tree (QF / SF / Final).
 */
export function StageHeader({
  title,
  className,
  navigation,
}: StageHeaderProps) {
  return (
    <div className={cx(ROOT_CLASS, className)}>
      {navigation && (
        <NavButton
          direction="prev"
          label={navigation.prevLabel}
          disabled={navigation.prevDisabled}
          onClick={navigation.onPrev}
        />
      )}

      <h3 className={TITLE_CLASS} style={TITLE_STYLE}>
        {title}
      </h3>

      {navigation && (
        <NavButton
          direction="next"
          label={navigation.nextLabel}
          disabled={navigation.nextDisabled}
          onClick={navigation.onNext}
        />
      )}
    </div>
  );
}

function NavButton({ label, disabled, onClick, direction }: NavButtonProps) {
  return (
    <IconButton
      aria-label={label}
      variant="transparent"
      className={NAV_BUTTON_CLASS}
      disabled={disabled}
      onClick={onClick}
    >
      <ChevronIcon direction={direction} />
    </IconButton>
  );
}

function ChevronIcon({ direction }: { direction: NavDirection }) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={CHEVRON_PATH_BY_DIRECTION[direction]}
      />
    </svg>
  );
}