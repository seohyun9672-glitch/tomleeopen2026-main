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
};

export async function getAllCategoryYearStatuses(): Promise<CategoryYearStatusRow[]> {
  noStore();
  const rows = await prisma.categoryYearStatus.findMany({
    select: { tournamentYear: true, categoryId: true, status: true },
  });
  return rows.map((r) => ({
    tournamentYear: r.tournamentYear,
    categoryId: normalizeCategoryId(r.categoryId),
    status: toCategoryYearStatus(r.status),
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
