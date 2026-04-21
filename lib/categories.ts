import { unstable_noStore as noStore } from "next/cache";

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryRecord = {
  id: string;
  label: string;
  labelKo: string | null;
  isDoubles: boolean;
  displayLabel: string;
  displayLabelKo: string;
  ntrp: string | null;
  sortOrder: number;
};

type Locale = "en" | "ko";

export const NTRP_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0+"] as const;
export type NTRPLevel = (typeof NTRP_LEVELS)[number];

// ─── Category display helpers ─────────────────────────────────────────────────

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

function getDisplayLabel(c: CategoryRecord): string {
  return c.displayLabel.trim();
}

function getDisplayLabelKo(c: CategoryRecord): string {
  return c.displayLabelKo?.trim() || c.labelKo?.trim() || c.label;
}

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

// ─── Category chip styles ─────────────────────────────────────────────────────

const DEFAULT_CATEGORY_CHIP_SURFACE =
  "border-0 bg-[var(--category-chip-default-bg)] text-[var(--category-chip-default-text)]";

export const CATEGORY_CHIP_PRESETS: Record<string, { chipSurfaceClass: string }> = {
  "MD-B": { chipSurfaceClass: "border-0 bg-[var(--category-chip-md-b-bg)] text-[var(--category-chip-md-b-text)]" },
  "MD-S": { chipSurfaceClass: "border-0 bg-[var(--category-chip-md-s-bg)] text-[var(--category-chip-md-s-text)]" },
  "MD-G": { chipSurfaceClass: "border-0 bg-[var(--category-chip-md-g-bg)] text-[var(--category-chip-md-g-text)]" },
  "MS-B": { chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-b-bg)] text-[var(--category-chip-ms-b-text)]" },
  "MS-S": { chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-s-bg)] text-[var(--category-chip-ms-s-text)]" },
  "MS-G": { chipSurfaceClass: "border-0 bg-[var(--category-chip-ms-g-bg)] text-[var(--category-chip-ms-g-text)]" },
  "XD-B": { chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-b-bg)] text-[var(--category-chip-xd-b-text)]" },
  "XD-S": { chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-s-bg)] text-[var(--category-chip-xd-s-text)]" },
  "XD-G": { chipSurfaceClass: "border-0 bg-[var(--category-chip-xd-g-bg)] text-[var(--category-chip-xd-g-text)]" },
  "WD-B": { chipSurfaceClass: "border-0 bg-[var(--category-chip-wd-b-bg)] text-[var(--category-chip-wd-b-text)]" },
  "WD-S": { chipSurfaceClass: "border-0 bg-[var(--category-chip-wd-s-bg)] text-[var(--category-chip-wd-s-text)]" },
  "WS-B": { chipSurfaceClass: "border-0 bg-[var(--category-chip-ws-b-bg)] text-[var(--category-chip-ws-b-text)]" },
  "WS-S": { chipSurfaceClass: "border-0 bg-[var(--category-chip-ws-s-bg)] text-[var(--category-chip-ws-s-text)]" },
};

export function categoryChipClass(categoryId: string): string {
  const id = categoryId.trim().toUpperCase();
  return CATEGORY_CHIP_PRESETS[id]?.chipSurfaceClass ?? DEFAULT_CATEGORY_CHIP_SURFACE;
}

const CATEGORY_TAG_BASE_CLASS = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium";

export function getCategoryTagClasses(categoryId: string): string {
  return categoryChipClass(categoryId);
}

export function getCategoryTagFullClasses(categoryId: string): string {
  return `${CATEGORY_TAG_BASE_CLASS} ${categoryChipClass(categoryId)}`.trim();
}

// ─── Category-year status ─────────────────────────────────────────────────────

export const CATEGORY_YEAR_STATUSES = ["Pending", "Active", "Inactive"] as const;
export type CategoryYearStatus = (typeof CATEGORY_YEAR_STATUSES)[number];

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
  const t = v.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "confirmed") return "Active";
  if (lower === "cancelled") return "Inactive";
  for (const s of CATEGORY_YEAR_STATUSES) {
    if (s.toLowerCase() === lower) return s;
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

// ─── DB queries ───────────────────────────────────────────────────────────────

const FAMILY_PREFIXES = ["MD", "WD", "XD", "MS", "WS"];
const TIER_CODES = ["B", "S", "G"];

function categoryPrefixRank(id: string): number {
  const prefix = (id.split("-")[0] ?? "").toUpperCase();
  const idx = FAMILY_PREFIXES.indexOf(prefix);
  return idx >= 0 ? idx : FAMILY_PREFIXES.length;
}

function tierLetterRank(id: string): number {
  const last = id.slice(-1).toUpperCase();
  const idx = TIER_CODES.indexOf(last);
  return idx >= 0 ? idx : 9;
}

export async function getCategories(): Promise<CategoryRecord[]> {
  noStore();
  const rows = await prisma.category.findMany({
    orderBy: [{ id: "asc" }],
    select: { id: true, label: true, labelKo: true, isDoubles: true, ntrp: true, sortOrder: true },
  });
  return rows
    .map((c) => {
      const labelKo = c.labelKo?.trim() || null;
      const displayLabel = c.label.trim();
      const displayLabelKo = (labelKo ?? c.label).trim();
      const ntrp = c.ntrp?.trim() ? c.ntrp.replace(/\s*[–-]\s*/g, " – ") : null;
      return { ...c, labelKo, isDoubles: c.isDoubles, displayLabel, displayLabelKo, ntrp };
    })
    .filter((c) => c.label !== "Women's Singles")
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

export function getCategoryYearStatusDelegate(): {
  findMany: (args: object) => Promise<unknown>;
  upsert: (args: object) => Promise<unknown>;
} {
  const p = prisma as unknown as Record<string, { findMany: (args: object) => Promise<unknown>; upsert: (args: object) => Promise<unknown> }>;
  const d = p.categoryYearStatus ?? p.tournamentCategoryYear;
  if (!d?.findMany) {
    throw new Error(
      "Prisma client is missing the category year-status model. Run `npx prisma generate` and restart the dev server."
    );
  }
  return d;
}

function normalizedCategoryYearStatus(stored: string | undefined, tournamentYear: number) {
  return parseCategoryYearStatus(stored?.trim() ?? "") ?? defaultCategoryYearStatus(tournamentYear);
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

export async function getCategoryYearStatusList(tournamentYear: number): Promise<CategoryYearListItem[]> {
  const cy = getCategoryYearStatusDelegate();
  const [cats, rows] = await Promise.all([
    getCategories(),
    cy.findMany({
      where: { tournamentYear },
      select: { categoryId: true, status: true },
    }) as Promise<{ categoryId: string; status: string }[]>,
  ]);
  const byId = new Map(rows.map((r) => [r.categoryId, r.status]));
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
    teamCount.set(g.categoryId, g._count._all);
  }
  const playerSets = new Map<string, Set<number>>();
  for (const r of regs) {
    let s = playerSets.get(r.categoryId);
    if (!s) {
      s = new Set();
      playerSets.set(r.categoryId, s);
    }
    s.add(r.playerId);
    if (r.partnerId != null) s.add(r.partnerId);
  }
  const out: Record<string, CategoryParticipation> = {};
  for (const id of categoryIds) {
    out[id] = {
      teams: teamCount.get(id) ?? 0,
      players: playerSets.get(id)?.size ?? 0,
    };
  }
  return out;
}
