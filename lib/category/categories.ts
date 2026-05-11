import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CategoryRecord = {
  id: string;
  label: string;
  labelKo: string | null;
  isDoubles: boolean;
  ntrp: string | null;
  sortOrder: number;
};

type Locale = "en" | "ko";

export function categoryLabel(
  row: { label: string; labelKo: string | null } | null | undefined,
  locale: Locale
): string | null {
  if (!row) return null;
  const label = row.label.trim();
  if (locale === "en") return label;
  return row.labelKo?.trim() || label;
}

export function buildCategoryByIdMap(categories: CategoryRecord[]): Map<string, CategoryRecord> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function categoryLabelForId(
  byId: Map<string, CategoryRecord>,
  categoryId: string,
  locale: Locale
): string {
  const row = byId.get(categoryId);
  if (!row) return categoryId;
  return categoryLabel(row, locale) ?? row.label;
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

export type CategoryYearStatus = "Pending" | "Active" | "Inactive";

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
    select: { id: true, label: true, labelKo: true, isDoubles: true, ntrp: true, sortOrder: true },
  });

  return rows
    .map((c) => ({
      id: normalizeCategoryId(c.id),
      label: normalizeText(c.label),
      labelKo: normalizeText(c.labelKo) || null,
      isDoubles: c.isDoubles,
      ntrp: normalizeText(c.ntrp).replace(/\s*[–-]\s*/g, " – ") || null,
      sortOrder: c.sortOrder,
    }))
    .sort((a, b) => {
      const bySortOrder = a.sortOrder - b.sortOrder;
      if (bySortOrder !== 0) return bySortOrder;
      return a.id.localeCompare(b.id);
    });
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
      status: explicit ? toCategoryYearStatus(explicit) : tournamentYear >= 2026 ? "Pending" : "Active",
    };
  });
}
