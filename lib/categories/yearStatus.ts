/**
 * Category-year status types and pure helpers — safe for Client Components (no DB).
 * Server loaders live in `yearStatus.server.ts`.
 */
export const CATEGORY_YEAR_STATUSES = ["Pending", "Active", "Inactive"] as const;
export type CategoryYearStatus = (typeof CATEGORY_YEAR_STATUSES)[number];

/** New tournament years default to Pending; historical years default to Active when unset. */
export function defaultCategoryYearStatus(tournamentYear: number): CategoryYearStatus {
  return tournamentYear >= 2026 ? "Pending" : "Active";
}

export function parseCategoryYearStatus(v: unknown): CategoryYearStatus | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  // Accept legacy DB values stored before the rename.
  if (lower === "confirmed") return "Active";
  if (lower === "cancelled") return "Inactive";
  for (const s of CATEGORY_YEAR_STATUSES) {
    if (s.toLowerCase() === lower) return s;
  }
  return null;
}

export type CategoryYearListItem = {
  categoryId: string;
  status: CategoryYearStatus;
};

export type CategoryParticipation = {
  teams: number;
  players: number;
};

/** Drop categories marked `Inactive` for that tournament year (public filters / tabs). */
export function excludeCancelledCategoriesForYear<T extends { id: string }>(
  categories: readonly T[],
  statusList: CategoryYearListItem[]
): T[] {
  const inactive = new Set(
    statusList
      .filter((r) => parseCategoryYearStatus(r.status) === "Inactive")
      .map((r) => r.categoryId)
  );
  if (inactive.size === 0) return [...categories];
  return categories.filter((c) => !inactive.has(c.id));
}

/** Per-year list from `getCategoryYearStatusList` — true only for explicit `Active`. */
export function isCategoryConfirmedForYear(
  categoryId: string,
  statusList: CategoryYearListItem[]
): boolean {
  const row = statusList.find((r) => r.categoryId === categoryId);
  return parseCategoryYearStatus(row?.status) === "Active";
}

/** Category rows for a year where admin status is `Active` (excludes Pending and Inactive). */
export function categoriesConfirmedForYear<T extends { id: string }>(
  categories: readonly T[],
  statusList: CategoryYearListItem[]
): T[] {
  return categories.filter((c) => isCategoryConfirmedForYear(c.id, statusList));
}

/** Same rule when you only have the admin `categoryStatusById` map for that year. */
export function isCategoryConfirmedInYearMap(
  categoryId: string,
  categoryStatusById: Record<string, string | undefined>
): boolean {
  return parseCategoryYearStatus(categoryStatusById[categoryId]) === "Active";
}
