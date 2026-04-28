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
  return categoryDisplayLabelFromDbRow(row, locale) ?? row.label;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeLookupKey(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

function normalizeCategoryId(value: string | null | undefined): string {
  return normalizeText(value).toUpperCase();
}

export function getCategory(
  categories: CategoryRecord[],
  value: string
): CategoryRecord | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  const normalizedId = normalizeCategoryId(raw);
  for (const c of categories) {
    if (normalizeCategoryId(c.id) === normalizedId) return c;
  }

  const normalizedValue = normalizeLookupKey(raw);
  return (
    categories.find((c) =>
      [normalizeLookupKey(c.label), normalizeLookupKey(c.labelKo)].includes(normalizedValue)
    ) ?? null
  );
}

const DEFAULT_CATEGORY_CHIP_SURFACE =
  "border-0 bg-[var(--category-chip-default-bg)] text-[var(--category-chip-default-text)]";

export const CATEGORY_CHIP_PRESETS: Record<string, { chipSurfaceClass: string }> = {
  "MD-B": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-md-b-bg)] text-[var(--category-chip-md-b-text)]",
  },
  "MD-S": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-md-s-bg)] text-[var(--category-chip-md-s-text)]",
  },
  "MD-G": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-md-g-bg)] text-[var(--category-chip-md-g-text)]",
  },
  "MS-B": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-ms-b-bg)] text-[var(--category-chip-ms-b-text)]",
  },
  "MS-S": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-ms-s-bg)] text-[var(--category-chip-ms-s-text)]",
  },
  "MS-G": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-ms-g-bg)] text-[var(--category-chip-ms-g-text)]",
  },
  "XD-B": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-xd-b-bg)] text-[var(--category-chip-xd-b-text)]",
  },
  "XD-S": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-xd-s-bg)] text-[var(--category-chip-xd-s-text)]",
  },
  "XD-G": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-xd-g-bg)] text-[var(--category-chip-xd-g-text)]",
  },
  "WD-B": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-wd-b-bg)] text-[var(--category-chip-wd-b-text)]",
  },
  "WD-S": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-wd-s-bg)] text-[var(--category-chip-wd-s-text)]",
  },
  "WS-B": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-ws-b-bg)] text-[var(--category-chip-ws-b-text)]",
  },
  "WS-S": {
    chipSurfaceClass:
      "border-0 bg-[var(--category-chip-ws-s-bg)] text-[var(--category-chip-ws-s-text)]",
  },
};

export function categoryChipClass(categoryId: string): string {
  const id = normalizeCategoryId(categoryId);
  return CATEGORY_CHIP_PRESETS[id]?.chipSurfaceClass ?? DEFAULT_CATEGORY_CHIP_SURFACE;
}

export const CATEGORY_YEAR_STATUSES = {
  Pending: { label: { en: "Pending", ko: "대기" } },
  Active: { label: { en: "Active", ko: "활성" } },
  Inactive: { label: { en: "Inactive", ko: "비활성" } },
} as const;
export type CategoryYearStatus = keyof typeof CATEGORY_YEAR_STATUSES;

export function categoryYearStatusLabel(status: CategoryYearStatus, locale: "en" | "ko"): string {
  return CATEGORY_YEAR_STATUSES[status].label[locale];
}

export type CategoryYearListItem = {
  categoryId: string;
  status: CategoryYearStatus;
};

export type CategoryParticipation = {
  teams: number;
  players: number;
};

export function defaultCategoryYearStatus(tournamentYear: number): CategoryYearStatus {
  return tournamentYear >= 2026 ? "Pending" : "Active";
}

export function parseCategoryYearStatus(v: unknown): CategoryYearStatus | null {
  if (typeof v !== "string") return null;

  const normalized = normalizeLookupKey(v);
  if (!normalized) return null;
  if (normalized === "confirmed") return "Active";
  if (normalized === "cancelled") return "Inactive";

  for (const s of Object.keys(CATEGORY_YEAR_STATUSES) as CategoryYearStatus[]) {
    if (s.toLowerCase() === normalized) return s;
  }

  return null;
}

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

export function isCategoryConfirmedForYear(
  categoryId: string,
  statusList: CategoryYearListItem[]
): boolean {
  const row = statusList.find((r) => r.categoryId === categoryId);
  return parseCategoryYearStatus(row?.status) === "Active";
}

export function categoriesConfirmedForYear<T extends { id: string }>(
  categories: readonly T[],
  statusList: CategoryYearListItem[]
): T[] {
  return categories.filter((c) => isCategoryConfirmedForYear(c.id, statusList));
}

export function isCategoryConfirmedInYearMap(
  categoryId: string,
  categoryStatusById: Record<string, string | undefined>
): boolean {
  return parseCategoryYearStatus(categoryStatusById[categoryId]) === "Active";
}

const FAMILY_PREFIXES = ["MD", "WD", "XD", "MS", "WS"];
const TIER_CODES = ["B", "S", "G"];

function categoryPrefixRank(id: string): number {
  const prefix = (normalizeCategoryId(id).split("-")[0] ?? "").toUpperCase();
  const idx = FAMILY_PREFIXES.indexOf(prefix);
  return idx >= 0 ? idx : FAMILY_PREFIXES.length;
}

function tierLetterRank(id: string): number {
  const normalized = normalizeCategoryId(id);
  const last = normalized.slice(-1);
  const idx = TIER_CODES.indexOf(last);
  return idx >= 0 ? idx : 9;
}

function normalizeNtrp(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  return trimmed.replace(/\s*[–-]\s*/g, " – ");
}

export async function getCategories(): Promise<CategoryRecord[]> {
  noStore();

  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      label: true,
      labelKo: true,
      isDoubles: true,
      ntrp: true,
      sortOrder: true,
    },
  });

  return rows
    .map((c) => ({
      id: normalizeCategoryId(c.id),
      label: normalizeText(c.label),
      labelKo: normalizeText(c.labelKo) || null,
      isDoubles: c.isDoubles,
      ntrp: normalizeNtrp(c.ntrp),
      sortOrder: c.sortOrder,
    }))
    .sort((a, b) => {
      const byPrefix = categoryPrefixRank(a.id) - categoryPrefixRank(b.id);
      if (byPrefix !== 0) return byPrefix;

      const byTierLetter = tierLetterRank(a.id) - tierLetterRank(b.id);
      if (byTierLetter !== 0) return byTierLetter;

      const byDbOrder = a.sortOrder - b.sortOrder;
      if (byDbOrder !== 0) return byDbOrder;

      return a.id.localeCompare(b.id);
    });
}

type CategoryYearStatusDelegate = {
  findMany: (args: {
    distinct?: string[];
    select?: Record<string, boolean>;
    orderBy?: Record<string, "asc" | "desc">;
    where?: Record<string, unknown>;
  }) => Promise<unknown[]>;
  upsert: (args: object) => Promise<unknown>;
};

export function getCategoryYearStatusDelegate(): CategoryYearStatusDelegate {
  const maybePrisma = prisma as unknown as {
    categoryYearStatus?: CategoryYearStatusDelegate;
    tournamentCategoryYear?: CategoryYearStatusDelegate;
  };

  const delegate = maybePrisma.categoryYearStatus ?? maybePrisma.tournamentCategoryYear;

  if (!delegate?.findMany || !delegate?.upsert) {
    throw new Error(
      "Prisma client is missing the category year-status model. Run `npx prisma generate` and restart the dev server."
    );
  }

  return delegate;
}

function normalizedCategoryYearStatus(stored: string | undefined, tournamentYear: number) {
  return parseCategoryYearStatus(stored) ?? defaultCategoryYearStatus(tournamentYear);
}

export async function getDistinctTournamentCategoryYearsForFilter(): Promise<number[]> {
  const cy = getCategoryYearStatusDelegate();

  const rows = (await cy.findMany({
    distinct: ["tournamentYear"],
    select: { tournamentYear: true },
    orderBy: { tournamentYear: "desc" },
  })) as { tournamentYear: number }[];

  return rows.map((r) => r.tournamentYear);
}

export async function getCategoryYearStatusList(
  tournamentYear: number
): Promise<CategoryYearListItem[]> {
  const cy = getCategoryYearStatusDelegate();

  const [cats, rows] = await Promise.all([
    getCategories(),
    cy.findMany({
      where: { tournamentYear },
      select: { categoryId: true, status: true },
    }) as Promise<{ categoryId: string; status: string }[]>,
  ]);

  const byId = new Map(rows.map((r) => [normalizeCategoryId(r.categoryId), r.status]));

  return cats.map((c) => ({
    categoryId: c.id,
    status: normalizedCategoryYearStatus(byId.get(c.id), tournamentYear),
  }));
}

export async function getCategoryParticipationForYear(
  tournamentYear: number,
  categoryIds: readonly string[]
): Promise<Record<string, CategoryParticipation>> {
  const [teamGroups, regs] = await Promise.all([
    prisma.team.groupBy({
      by: ["categoryId"],
      where: { tournamentYear },
      _count: { _all: true },
    }),
    prisma.tournamentRegistration.findMany({
      where: { tournamentYear },
      select: { categoryId: true, playerId: true, partnerId: true },
    }),
  ]);

  const teamCount = new Map<string, number>();
  for (const g of teamGroups) {
    teamCount.set(normalizeCategoryId(g.categoryId), g._count._all);
  }

  const playerSets = new Map<string, Set<number>>();
  for (const r of regs) {
    const categoryId = normalizeCategoryId(r.categoryId);
    let set = playerSets.get(categoryId);

    if (!set) {
      set = new Set<number>();
      playerSets.set(categoryId, set);
    }

    set.add(r.playerId);
    if (r.partnerId != null) set.add(r.partnerId);
  }

  const out: Record<string, CategoryParticipation> = {};
  for (const rawId of categoryIds) {
    const id = normalizeCategoryId(rawId);
    out[id] = {
      teams: teamCount.get(id) ?? 0,
      players: playerSets.get(id)?.size ?? 0,
    };
  }

  return out;
}
