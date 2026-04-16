import { categoryChipClass } from "@/lib/ui/dataChipPresets";
import { clubChipClass } from "@/lib/clubColors";

/** Match / registration status tones — same shell as club/category table chips */
export type TableDataChipTone =
  | "neutral"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "postponed"
  | "reg-active"
  | "reg-cancelled"
  | "reg-refunded";

const STATUS_TONE_SURFACE: Record<TableDataChipTone, string> = {
  neutral: "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
  scheduled: "bg-[var(--match-status-scheduled-bg)] text-[var(--match-status-scheduled-text)]",
  completed: "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
  cancelled: "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
  postponed: "bg-[var(--match-status-postponed-bg)] text-[var(--match-status-postponed-text)]",
  "reg-active": "bg-[var(--data-chip-success-bg)] text-[var(--data-chip-success-text)]",
  "reg-cancelled": "bg-[var(--data-chip-status-cancelled-bg)] text-[var(--data-chip-status-cancelled-text)]",
  "reg-refunded": "bg-[var(--data-chip-neutral-bg)] text-[var(--data-chip-neutral-text)]",
};

/** Colour-only layer for {@link Chip} + data shell */
export function dataChipStatusSurfaceClass(tone: TableDataChipTone): string {
  return STATUS_TONE_SURFACE[tone];
}

/** Colour-only helpers (shape/sizing comes from component-level chip shells). */
export function tableCategorySurfaceClass(categoryId: string): string {
  return categoryChipClass(categoryId);
}

export function tableClubSurfaceClass(clubCode: string): string {
  return clubChipClass(clubCode);
}

/** Map DB / UI match status strings to a chip tone (exact labels as stored). */
export function matchStatusToChipTone(status: string): TableDataChipTone {
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

/** Case-insensitive status → chip tone (for free-text / UI labels). */
export function matchStatusToChipToneLoose(status: string): TableDataChipTone {
  const s = status.trim().toLowerCase();
  if (s === "scheduled") return "scheduled";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "postponed") return "postponed";
  if (s === "pending") return "neutral";
  return "neutral";
}
