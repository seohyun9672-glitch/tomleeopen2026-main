/**
 * Tournament categories: DB catalog, labels, per-year status, hub data, and UI tokens.
 *
 * **Client components:** import from subpaths (e.g. `@/lib/categories/labels`, `…/types`) or `@/lib/ui/dataChipPresets` for chip / tag surface classes
 * so Prisma/server loaders are not bundled. **Server** code may use this barrel.
 */

export type { CategoryRecord } from "./types";

export { getCategories } from "./db";

export {
  buildCategoryByIdMap,
  categoryLabelForId,
  categoryDisplayLabelFromDbRow,
  getCategoryLabel,
  getCategoryLabelByLocale,
  getCategoryId,
  isDoublesCategory,
  NTRP_LEVELS,
  type NTRPLevel,
} from "./labels";


export {
  categoryChipClass,
  getCategoryTagClasses,
  getCategoryTagFullClasses,
} from "@/lib/ui/dataChipPresets";

export {
  CATEGORY_YEAR_STATUSES,
  defaultCategoryYearStatus,
  parseCategoryYearStatus,
  excludeCancelledCategoriesForYear,
  isCategoryConfirmedForYear,
  categoriesConfirmedForYear,
  isCategoryConfirmedInYearMap,
  type CategoryYearStatus,
  type CategoryYearListItem,
  type CategoryParticipation,
} from "./yearStatus";

export {
  getDistinctTournamentCategoryYearsForFilter,
  getCategoryYearStatusList,
  getCategoryParticipationForYear,
} from "./yearStatus.server";

export { getCategoryYearStatusDelegate } from "./yearStatusDelegate";

