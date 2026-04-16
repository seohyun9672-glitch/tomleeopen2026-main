"use client";

type TournamentTreeStageHeaderNav = {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel: string;
  nextLabel: string;
};

type TournamentTreeStageHeaderProps = {
  title: string;
  className?: string;
  /** Shown on small screens only — prev/next bracket columns (Roland Garros-style). */
  navigation?: TournamentTreeStageHeaderNav;
};

const NAV_BUTTON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-[var(--tournament-tree-stage-header-text)] outline-none transition hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-35 md:hidden";

const TITLE_STYLE = {
  display: "block",
  fontFamily: "var(--text-h3-font)",
  fontWeight: "var(--text-h3-weight)",
  fontSize: "var(--text-h3-display-size)",
  letterSpacing: "var(--text-h3-letter-spacing)",
  lineHeight: "var(--text-h3-line-height)",
} as const;

/**
 * Column title for the tournament bracket tree (QF / SF / Final).
 * Styles from `.tournament-tree-stage-header` + semantic tokens in globals.css.
 */
export function TournamentTreeStageHeader({
  title,
  className = "",
  navigation,
}: TournamentTreeStageHeaderProps) {
  const rootClass = [
    "tournament-tree-stage-header z-20 flex shrink-0 items-center justify-center gap-1 overflow-hidden px-1 py-2 md:px-2 md:py-2.5",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {navigation ? (
        <NavButton
          label={navigation.prevLabel}
          disabled={navigation.prevDisabled}
          onClick={navigation.onPrev}
          direction="prev"
        />
      ) : null}

      <h3
        className="m-0 min-w-0 flex-1 text-center text-[var(--tournament-tree-stage-header-text)]"
        style={TITLE_STYLE}
      >
        {title}
      </h3>

      {navigation ? (
        <NavButton
          label={navigation.nextLabel}
          disabled={navigation.nextDisabled}
          onClick={navigation.onNext}
          direction="next"
        />
      ) : null}
    </div>
  );
}

type NavButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  direction: "prev" | "next";
};

function NavButton({ label, disabled, onClick, direction }: NavButtonProps) {
  return (
    <button
      type="button"
      className={NAV_BUTTON_CLASS}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {direction === "prev" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}