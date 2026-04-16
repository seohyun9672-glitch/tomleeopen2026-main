/**
 * Display helpers for category records from `getCategories()` / API.
 * Prefer DB `label` / `labelKo`; `displayLabel*` are normalized for UI.
 */
import type { CategoryRecord } from "./types";


type Locale = "en" | "ko";

/** Minimal category row from Prisma `Match` include — avoids a separate `getCategories()` when present. */
export function categoryDisplayLabelFromDbRow(
  row: { label: string; labelKo: string | null } | null | undefined,
  locale: Locale
): string | null {
  if (!row) return null;

  const label = row.label.trim();
  if (locale === "en") return label;

  const labelKo = row.labelKo?.trim();
  return labelKo || label;
}

/** O(1) lookup table from category id → row (from `getCategories()` / API). */
export function buildCategoryByIdMap(categories: CategoryRecord[]): Map<string, CategoryRecord> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** Localized label when `categoryId` is a DB id; falls back to `categoryId` if unknown. */
export function categoryLabelForId(
  byId: Map<string, CategoryRecord>,
  categoryId: string,
  locale: Locale
): string {
  const row = byId.get(categoryId);
  if (!row) return categoryId;
  return categoryDisplayLabelFromDbRow(row, locale) ?? row.label;
}

function getDisplayLabel(c: CategoryRecord): string {
  return c.displayLabel.trim();
}

function getDisplayLabelKo(c: CategoryRecord): string {
  return c.displayLabelKo?.trim() || c.labelKo?.trim() || c.label;
}

/** Id-first (typical DB path), then legacy match on labels. */
function findCategory(categories: CategoryRecord[], value: string): CategoryRecord | undefined {
  if (!value) return undefined;
  for (const c of categories) {
    if (c.id === value) return c;
  }
  return categories.find((c) => matchesCategoryExceptId(c, value));
}

function matchesCategoryExceptId(c: CategoryRecord, value: string): boolean {
  return (
    c.label === value ||
    getDisplayLabel(c) === value ||
    (c.labelKo?.trim() ?? "") === value ||
    getDisplayLabelKo(c) === value
  );
}

export function getCategoryLabel(categories: CategoryRecord[], idOrLabel: string): string {
  const category = findCategory(categories, idOrLabel);
  return category ? getDisplayLabel(category) : idOrLabel;
}

export function getCategoryLabelByLocale(
  categories: CategoryRecord[],
  idOrLabel: string,
  locale: Locale
): string {
  const category = findCategory(categories, idOrLabel);
  if (!category) return idOrLabel;

  return locale === "ko" ? getDisplayLabelKo(category) : getDisplayLabel(category);
}

export function getCategoryId(categories: CategoryRecord[], idOrLabel: string): string {
  const category = findCategory(categories, idOrLabel);
  return category ? category.id : idOrLabel;
}

export function isDoublesCategory(label: string): boolean {
  return /doubles/i.test(label);
}

export const NTRP_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0+"] as const;
export type NTRPLevel = (typeof NTRP_LEVELS)[number];