/**
 * Single source for table chip + match-card badge surfaces (category, club, status),
 * and category tag pill colors (player directory / profile tags).
 * Labels are supplied at the UI layer (i18n / row data); this module only defines variant keys and Tailwind/CSS-token classes.
 */

// ─── Status (match + registration tones) ─────────────────────────────────────

export type DataChipStatusVariant =
  | "neutral"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "postponed"
  | "reg-active"
  | "reg-cancelled";

/** Variant key + chip row surface + match-card badge surface (border + fill + text). */
export const DATA_CHIP_STATUS_PRESETS: Record<
  DataChipStatusVariant,
  { variant: DataChipStatusVariant; chipSurfaceClass: string; badgeSurfaceClass: string }
> = {
  neutral: {
    variant: "neutral",
    chipSurfaceClass: "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-default-border)] bg-[var(--match-status-default-bg)] text-[var(--match-status-default-text)]",
  },
  scheduled: {
    variant: "scheduled",
    chipSurfaceClass: "bg-[var(--match-status-scheduled-bg)] text-[var(--match-status-scheduled-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-scheduled-border)] bg-[var(--match-status-scheduled-bg)] text-[var(--match-status-scheduled-text)]",
  },
  completed: {
    variant: "completed",
    chipSurfaceClass: "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-completed-border)] bg-[var(--match-status-completed-bg)] text-[var(--match-status-completed-text)]",
  },
  cancelled: {
    variant: "cancelled",
    chipSurfaceClass: "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-cancelled-border)] bg-[var(--match-status-cancelled-bg)] text-[var(--match-status-cancelled-text)]",
  },
  postponed: {
    variant: "postponed",
    chipSurfaceClass: "bg-[var(--match-status-postponed-bg)] text-[var(--match-status-postponed-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-postponed-border)] bg-[var(--match-status-postponed-bg)] text-[var(--match-status-postponed-text)]",
  },
  "reg-active": {
    variant: "reg-active",
    chipSurfaceClass: "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-completed-border)] bg-[var(--match-status-completed-bg)] text-[var(--match-status-completed-text)]",
  },
  "reg-cancelled": {
    variant: "reg-cancelled",
    chipSurfaceClass: "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
    badgeSurfaceClass:
      "border-[var(--match-status-cancelled-border)] bg-[var(--match-status-cancelled-bg)] text-[var(--match-status-cancelled-text)]",
  },
};

export function dataChipStatusChipSurfaceClass(variant: DataChipStatusVariant): string {
  return DATA_CHIP_STATUS_PRESETS[variant].chipSurfaceClass;
}

export function dataChipStatusBadgeSurfaceClass(variant: DataChipStatusVariant): string {
  return DATA_CHIP_STATUS_PRESETS[variant].badgeSurfaceClass;
}

/** Match row `matchStatus` (API / DB) → variant for chips + badges. */
export function matchStatusToDataChipVariant(status: string): DataChipStatusVariant {
  const s = status.trim();
  switch (s) {
    case "Scheduled":
      return "scheduled";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "Postponed":
      return "postponed";
    case "Pending":
    default:
      return "neutral";
  }
}

/** Free-text status (e.g. filters) → variant. */
export function matchStatusLooseToDataChipVariant(status: string): DataChipStatusVariant {
  const s = status.trim().toLowerCase();
  if (s === "scheduled") return "scheduled";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "postponed") return "postponed";
  if (s === "pending") return "neutral";
  return "neutral";
}

/** Match card header badge: full border/bg/text class string from API status. */
export function matchStatusBadgeClassName(status: string): string {
  return dataChipStatusBadgeSurfaceClass(matchStatusToDataChipVariant(status));
}

/** @deprecated Prefer {@link DataChipStatusVariant} — same union, kept for table/chip call sites. */
export type TableDataChipTone = DataChipStatusVariant;

/** @deprecated Use {@link matchStatusToDataChipVariant} */
export const matchStatusToChipTone = matchStatusToDataChipVariant;

/** @deprecated Use {@link matchStatusLooseToDataChipVariant} */
export const matchStatusToChipToneLoose = matchStatusLooseToDataChipVariant;

// ─── Clubs ───────────────────────────────────────────────────────────────────

const DEFAULT_CLUB_CHIP_SURFACE =
  "border-0 bg-[var(--club-chip-default-bg)] text-[var(--club-chip-default-text)]";

export const CLUB_CHIP_PRESETS = {
  harang: {
    variant: "harang" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-harang-bg)] text-[var(--club-chip-harang-text)]",
  },
  vktc: {
    variant: "vktc" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-vktc-bg)] text-[var(--club-chip-vktc-text)]",
  },
  ctc: {
    variant: "ctc" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-ctc-bg)] text-[var(--club-chip-ctc-text)]",
  },
  clayton: {
    variant: "clayton" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-clayton-bg)] text-[var(--club-chip-clayton-text)]",
  },
  sagol: {
    variant: "sagol" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-sagol-bg)] text-[var(--club-chip-sagol-text)]",
  },
  machang: {
    variant: "machang" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-machang-bg)] text-[var(--club-chip-machang-text)]",
  },
  langley: {
    variant: "langley" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-langley-bg)] text-[var(--club-chip-langley-text)]",
  },
  na: {
    variant: "na" as const,
    chipSurfaceClass: "border-0 bg-[var(--club-chip-na-bg)] text-[var(--club-chip-na-text)]",
  },
} as const;

export type ClubChipVariant = keyof typeof CLUB_CHIP_PRESETS;

export function clubChipClass(clubCode: string): string {
  const key = clubCode.trim().toLowerCase();
  const colorKey = key === "n/a" || key === "na" ? "na" : key;
  const preset = CLUB_CHIP_PRESETS[colorKey as ClubChipVariant];
  return preset?.chipSurfaceClass ?? DEFAULT_CLUB_CHIP_SURFACE;
}

// ─── Categories ───────────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_CHIP_SURFACE =
  "border-0 bg-[var(--category-chip-default-bg)] text-[var(--category-chip-default-text)]";

/**
 * Each preset uses full literal Tailwind arbitrary values (e.g. bg + text tokens per category id) so the
 * compiler can extract them. Do not use dynamic template strings for those class names — the scanner
 * will miss them. (Club presets use the same pattern.)
 */
export const CATEGORY_CHIP_PRESETS: Record<string, { variant: string; chipSurfaceClass: string }> = {
  "MD-B": { variant: "MD-B", chipSurfaceClass: "border-0 bg-[var(--category-chip-md-b-bg)] text-[var(--category-chip-md-b-text)]" },
  "MD-S": { variant: "MD-S", chipSurfaceClass: "border-0 bg-[var(--category-chip-md-s-bg)] text-[var(--category-chip-md-s-text)]" },
  "MD-G": { variant: "MD-G", chipSurfaceClass: "border-0 bg-[var(--category-chip-md-g-bg)] text-[var(--category-chip-md-g-text)]" },
  "MS-B": { variant: "MS-B", chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-b-bg)] text-[var(--category-chip-ms-b-text)]" },
  "MS-S": { variant: "MS-S", chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-s-bg)] text-[var(--category-chip-ms-s-text)]" },
  "MS-G": { variant: "MS-G", chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-g-bg)] text-[var(--category-chip-ms-g-text)]" },
  "XD-B": { variant: "XD-B", chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-b-bg)] text-[var(--category-chip-xd-b-text)]" },
  "XD-S": { variant: "XD-S", chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-s-bg)] text-[var(--category-chip-xd-s-text)]" },
  "XD-G": { variant: "XD-G", chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-g-bg)] text-[var(--category-chip-xd-g-text)]" },
  "WD-B": { variant: "WD-B", chipSurfaceClass: "border-0 bg-[var(--category-chip-wd-b-bg)] text-[var(--category-chip-wd-b-text)]" },
  "WD-S": { variant: "WD-S", chipSurfaceClass: "border-0 bg-[var(--category-chip-wd-s-bg)] text-[var(--category-chip-wd-s-text)]" },
  "WS-B": { variant: "WS-B", chipSurfaceClass: "border-0 bg-[var(--category-chip-ws-b-bg)] text-[var(--category-chip-ws-b-text)]" },
  "WS-S": { variant: "WS-S", chipSurfaceClass: "border-0 bg-[var(--category-chip-ws-s-bg)] text-[var(--category-chip-ws-s-text)]" },
};

export function categoryChipClass(categoryId: string): string {
  const id = categoryId.trim().toUpperCase();
  return CATEGORY_CHIP_PRESETS[id]?.chipSurfaceClass ?? DEFAULT_CATEGORY_CHIP_SURFACE;
}

// ─── Category tags (same tokens as table chips / club-style presets) ─────────

const CATEGORY_TAG_BASE_CLASS = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium";

/** Surface classes for small category tags — uses {@link categoryChipClass} and globals category chip tokens, not a shared palette. */
export function getCategoryTagClasses(categoryId: string): string {
  return categoryChipClass(categoryId);
}

export function getCategoryTagFullClasses(categoryId: string): string {
  return `${CATEGORY_TAG_BASE_CLASS} ${getCategoryTagClasses(categoryId)}`.trim();
}
