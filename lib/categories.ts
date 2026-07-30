import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CategoryRecord = {
  id: string;
  label: string;
  labelKo: string | null;
  category: string | null;
  categoryKo: string | null;
  tier: string | null;
  tierKo: string | null;
  isDoubles: boolean;
  ntrp: string | null;
  sortOrder: number;
  prelimFormat: string | null;
};

type Locale = "en" | "ko";

export function buildCategoryByIdMap(categories: CategoryRecord[]): Map<string, CategoryRecord> {
  return new Map(categories.map((c) => [c.id, c]));
}

/**
 * Canonical category order — same key used everywhere a category list needs
 * a stable, meaningful order (the registration form, admin filters, charts):
 * `sortOrder` ascending, with `id` as a tiebreaker. Centralized here so every
 * category dropdown/filter across the app sorts identically instead of each
 * call site re-deriving its own (often alphabetical-by-label) order.
 */
export function sortCategoryOptions<T extends { id: string }>(
  options: T[],
  byId: Map<string, CategoryRecord>,
): T[] {
  return [...options].sort((a, b) => {
    const diff = (byId.get(a.id)?.sortOrder ?? 999) - (byId.get(b.id)?.sortOrder ?? 999);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

export type CategoryOption = { id: string; label: string; labelKo: string | null };

/** The category-group key (e.g. "Men's Doubles") a category id belongs to — falls back to its combined label when `category` isn't set. */
export function categoryGroupKeyForId(byId: Map<string, CategoryRecord>, categoryId: string): string | null {
  const cat = byId.get(categoryId);
  if (!cat) return null;
  return cat.category ?? cat.label;
}

/** The tier key (e.g. "Silver") a category id belongs to — falls back to its own id when `tier` isn't set. */
export function categoryTierKeyForId(byId: Map<string, CategoryRecord>, categoryId: string): string | null {
  const cat = byId.get(categoryId);
  if (!cat) return null;
  return cat.tier ?? cat.id;
}

/**
 * Category-group options (e.g. "Men's Doubles") for splitting a combined
 * category filter into category + tier. Scoped to whichever category ids
 * are actually present (e.g. already year-filtered), sorted the same way
 * every other category dropdown is (`sortOrder`, `id` tiebreak).
 */
export function deriveCategoryGroupOptions(
  presentCategoryIds: Iterable<string>,
  byId: Map<string, CategoryRecord>,
): CategoryOption[] {
  const seen = new Map<string, CategoryOption & { sortOrder: number }>();
  for (const id of presentCategoryIds) {
    const cat = byId.get(id);
    if (!cat) continue;
    const key = categoryGroupKeyForId(byId, id)!;
    if (!seen.has(key)) {
      seen.set(key, { id: key, label: cat.category ?? cat.label, labelKo: cat.categoryKo ?? cat.labelKo, sortOrder: cat.sortOrder });
    }
  }
  return [...seen.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(({ id, label, labelKo }) => ({ id, label, labelKo }));
}

/** Tier options (e.g. "Silver") within a given category group, same scoping/sorting as {@link deriveCategoryGroupOptions}. */
export function deriveTierOptionsForGroup(
  presentCategoryIds: Iterable<string>,
  byId: Map<string, CategoryRecord>,
  groupId?: string,
): CategoryOption[] {
  const seen = new Map<string, CategoryOption & { sortOrder: number }>();
  for (const id of presentCategoryIds) {
    const cat = byId.get(id);
    if (!cat) continue;
    if (groupId && categoryGroupKeyForId(byId, id) !== groupId) continue;
    const tierKey = categoryTierKeyForId(byId, id)!;
    if (!seen.has(tierKey)) {
      seen.set(tierKey, { id: tierKey, label: cat.tier ?? cat.label, labelKo: cat.tierKo ?? cat.labelKo, sortOrder: cat.sortOrder });
    }
  }
  return [...seen.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(({ id, label, labelKo }) => ({ id, label, labelKo }));
}

/**
 * Combined category+tier options for a single grouped-popover filter (used
 * where the category-group/tier split into two separate filters isn't
 * wanted, e.g. Draws) — each option resolves directly to a real category id,
 * with the category-group as its `group` for a grouped-header popover
 * (mirrors {@link deriveCategoryGroupOptions}/{@link deriveTierOptionsForGroup}'s
 * scoping/sorting, just flattened into one list instead of two cascading ones).
 */
export function deriveGroupedCategoryOptions(
  presentCategoryIds: Iterable<string>,
  byId: Map<string, CategoryRecord>,
): (CategoryOption & { group: string; groupKo: string | null })[] {
  const cats = [...new Set(presentCategoryIds)]
    .map((id) => byId.get(id))
    .filter((c): c is CategoryRecord => !!c)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return cats.map((c) => ({
    id: c.id,
    label: c.label,
    labelKo: c.labelKo,
    group: c.category ?? c.label,
    groupKo: c.categoryKo ?? c.labelKo,
  }));
}

/** Resolves the concrete `CategoryRecord.id` matching a category-group + tier selection. */
export function resolveCategoryIdForGroupTier(
  byId: Map<string, CategoryRecord>,
  groupId: string,
  tierId: string,
): string | undefined {
  for (const cat of byId.values()) {
    if (categoryGroupKeyForId(byId, cat.id) === groupId && categoryTierKeyForId(byId, cat.id) === tierId) return cat.id;
  }
  return undefined;
}

export function categoryLabelForId(
  byId: Map<string, CategoryRecord>,
  categoryId: string,
  locale: Locale
): string {
  const row = byId.get(categoryId);
  if (!row) return categoryId;
  if (locale === "en") return row.label.trim();
  return row.labelKo?.trim() || row.label.trim();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeCategoryId(value: string | null | undefined): string {
  return normalizeText(value).toUpperCase();
}

export function categoryChipClass(categoryId: string): string {
  return `border-0 category-chip-${normalizeCategoryId(categoryId).toLowerCase()}`;
}

// Mirrors the `.category-chip-*` rules in app/globals.css ("CATEGORY CHIP
// COLORS") — same categoryId → pastel color mapping, but returning a CSS
// color value (for chart fills, etc.) instead of a class name.
const CATEGORY_COLOR_FG: Record<string, string> = {
  "md-b": "--pastel-peach-fg",
  "md-s": "--pastel-peach-mid-fg",
  "md-g": "--pastel-peach-mid-fg",
  "md-o": "--pastel-rose-fg",
  "ms-b": "--pastel-sky-fg",
  "ms-s": "--pastel-sky-mid-fg",
  "ms-g": "--pastel-sky-deep-fg",
  "ms-o": "--pastel-periwinkle-fg",
  "xd-b": "--pastel-pink-fg",
  "xd-s": "--pastel-violet-fg",
  "xd-g": "--pastel-slate-fg",
  "wd-b": "--pastel-butter-fg",
  "wd-s": "--pastel-lilac-fg",
  "wd-g": "--pastel-aqua-fg",
  "ws-b": "--pastel-mint-fg",
  "ws-s": "--pastel-sky-fg",
  "ws-g": "--pastel-neutral-fg",
};

/** Returns the `var(--pastel-*-fg)` color matching a category's chip color (see `categoryChipClass`). */
export function categoryChipColorVar(categoryId: string): string {
  const key = normalizeCategoryId(categoryId).toLowerCase();
  return `var(${CATEGORY_COLOR_FG[key] ?? "--pastel-neutral-fg"})`;
}

export type CategoryYearStatus = "Pending" | "Active" | "Inactive";
export const CATEGORY_YEAR_STATUSES: CategoryYearStatus[] = ["Pending", "Active", "Inactive"];

export function categoryStatusChipClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "active") return "category-status-chip-active";
  if (s === "inactive") return "category-status-chip-inactive";
  return "category-status-chip-pending";
}

const CATEGORY_STATUS_LABELS: Record<string, { en: string; ko: string }> = {
  active:   { en: "Active",   ko: "활성" },
  pending:  { en: "Pending",  ko: "대기" },
  inactive: { en: "Inactive", ko: "비활성" },
};

export function categoryStatusLabel(status: string, locale: "en" | "ko"): string {
  return CATEGORY_STATUS_LABELS[status.trim().toLowerCase()]?.[locale] ?? status;
}

export type CategoryYearListItem = {
  categoryId: string;
  status: CategoryYearStatus;
};

function toCategoryYearStatus(v: string): CategoryYearStatus {
  if (v === "Active" || v === "Inactive") return v;
  return "Pending";
}

export function isCategoryConfirmedForYear(
  categoryId: string,
  statusList: CategoryYearListItem[]
): boolean {
  return statusList.find((r) => r.categoryId === categoryId)?.status === "Active";
}

export function categoriesConfirmedForYear<T extends { id: string }>(
  categories: readonly T[],
  statusList: CategoryYearListItem[]
): T[] {
  return categories.filter((c) => isCategoryConfirmedForYear(c.id, statusList));
}

export async function getCategories(): Promise<CategoryRecord[]> {
  noStore();

  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, label: true, labelKo: true, category: true, categoryKo: true, tier: true, tierKo: true, isDoubles: true, ntrp: true, sortOrder: true, prelimFormat: true },
  });

  return rows
    .map((c) => ({
      id: normalizeCategoryId(c.id),
      label: normalizeText(c.label),
      labelKo: normalizeText(c.labelKo) || null,
      category: normalizeText(c.category) || null,
      categoryKo: normalizeText(c.categoryKo) || null,
      tier: normalizeText(c.tier) || null,
      tierKo: normalizeText(c.tierKo) || null,
      isDoubles: c.isDoubles,
      ntrp: normalizeText(c.ntrp).replace(/\s*[–-]\s*/g, " – ") || null,
      sortOrder: c.sortOrder,
      prelimFormat: c.prelimFormat ?? null,
    }))
    .sort((a, b) => {
      const bySortOrder = a.sortOrder - b.sortOrder;
      if (bySortOrder !== 0) return bySortOrder;
      return a.id.localeCompare(b.id);
    });
}

export type CategoryYearStatusRow = {
  tournamentYear: number;
  categoryId: string;
  status: CategoryYearStatus;
  prelimFormat: string | null;
};

export async function getAllCategoryYearStatuses(): Promise<CategoryYearStatusRow[]> {
  noStore();
  const rows = await prisma.categoryYearStatus.findMany({
    select: { tournamentYear: true, categoryId: true, status: true, prelimFormat: true },
  });
  return rows.map((r) => ({
    tournamentYear: r.tournamentYear,
    categoryId: normalizeCategoryId(r.categoryId),
    status: toCategoryYearStatus(r.status),
    prelimFormat: r.prelimFormat ?? null,
  }));
}

export async function getCategoryYearStatusList(
  tournamentYear: number,
  categories?: CategoryRecord[]
): Promise<CategoryYearListItem[]> {
  const [cats, rows] = await Promise.all([
    categories ? Promise.resolve(categories) : getCategories(),
    prisma.categoryYearStatus.findMany({
      where: { tournamentYear },
      select: { categoryId: true, status: true },
    }),
  ]);

  const byId = new Map(rows.map((r) => [normalizeCategoryId(r.categoryId), r.status]));

  return cats.map((c) => {
    const explicit = byId.get(c.id);
    return {
      categoryId: c.id,
      status: explicit ? toCategoryYearStatus(explicit) : "Pending",
    };
  });
}
