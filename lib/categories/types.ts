/** Category row shape from `getCategories()` / Prisma `Category`. */
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
