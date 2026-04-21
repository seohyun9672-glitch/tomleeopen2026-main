/**
 * Pure client-safe filter utilities — derive option lists from data and filter arrays
 * locally (no server round-trips). Used by PlayersTable, MatchesTable, RegistrationsTable,
 * DrawsHub, ScheduleHub, CategoryStatusTable, etc.
 */

import { categoriesConfirmedForYear, type CategoryYearListItem } from "@/lib/categories";

/**
 * Returns categories that are Active for the given year.
 * Use this wherever a category filter should reflect a year selection.
 */
export function deriveCategoriesForYear<T extends { id: string }>(
  categories: readonly T[],
  statusesByYear: Record<number, CategoryYearListItem[]>,
  year: number
): T[] {
  return categoriesConfirmedForYear(categories, statusesByYear[year] ?? []);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Sorted descending, deduplicated year list. */
export function deriveYearOptions(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => b - a);
}

/**
 * Extract sorted unique ISO date strings from any iterable of date values.
 * Skips null / undefined / non-ISO strings.
 */
export function deriveDateOptions(dates: (string | null | undefined)[]): string[] {
  return [
    ...new Set(dates.filter((d): d is string => typeof d === "string" && ISO_DATE.test(d))),
  ].sort();
}

/**
 * Filter an array to items where `getValue(item)` matches `value` (as a string).
 * Returns the original array unchanged when `value` is empty.
 */
export function filterByValue<T>(
  items: T[],
  getValue: (item: T) => string | number | null | undefined,
  value: string
): T[] {
  if (!value) return items;
  return items.filter((item) => String(getValue(item) ?? "") === value);
}
