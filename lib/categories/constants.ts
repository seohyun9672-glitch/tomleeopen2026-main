/** Family prefix on category id (before `-`), sort order for hub catalog / DB ordering. */
export const CATEGORY_FAMILY_PREFIXES = ["MD", "WD", "XD", "MS", "WS"] as const;

/** Tier suffix letter on category id: Bronze / Silver / Gold. */
export const CATEGORY_TIER_CODES = ["B", "S", "G"] as const;

/** Standard category ids; chip colors are CSS variables in app/globals.css (e.g. category-chip-md-b-bg). */
export const CATEGORY_ID = {
  MD_B: "MD-B",
  MD_S: "MD-S",
  MD_G: "MD-G",
  MS_B: "MS-B",
  MS_S: "MS-S",
  MS_G: "MS-G",
  XD_B: "XD-B",
  XD_S: "XD-S",
  XD_G: "XD-G",
  WD_B: "WD-B",
  WD_S: "WD-S",
  WS_B: "WS-B",
  WS_S: "WS-S",
} as const;

export type CategoryId = (typeof CATEGORY_ID)[keyof typeof CATEGORY_ID];

/** Doubles-style categories are identified by id prefix (DB is source of truth). */
export function isDoublesCategoryId(categoryId: string): boolean {
  return (
    categoryId.startsWith("MD-") ||
    categoryId.startsWith("WD-") ||
    categoryId.startsWith("XD-") ||
    categoryId.startsWith("SD60-")
  );
}

export const CATEGORY_IDS_WITH_CHIP_STYLES: readonly CategoryId[] = [
  CATEGORY_ID.MD_B,
  CATEGORY_ID.MD_S,
  CATEGORY_ID.MD_G,
  CATEGORY_ID.MS_B,
  CATEGORY_ID.MS_S,
  CATEGORY_ID.MS_G,
  CATEGORY_ID.XD_B,
  CATEGORY_ID.XD_S,
  CATEGORY_ID.XD_G,
  CATEGORY_ID.WD_B,
  CATEGORY_ID.WD_S,
  CATEGORY_ID.WS_B,
  CATEGORY_ID.WS_S,
];
