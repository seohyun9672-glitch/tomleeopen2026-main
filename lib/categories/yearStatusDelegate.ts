import { prisma } from "@/lib/prisma";

/**
 * Prisma delegate for per-year category status rows.
 * Supports both the current model name (`categoryYearStatus`) and legacy generated clients (`tournamentCategoryYear`).
 */
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
