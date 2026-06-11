import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

// Round code constants matching the seeded Round.code values.
export const ROUND_PRE = "PRE";
export const ROUND_R32 = "R32";
export const ROUND_R16 = "R16";
export const ROUND_QF  = "QF";
export const ROUND_SF  = "SF";
export const ROUND_F   = "F";

// Canonical display order for elimination bracket columns.
export const ELIMINATION_ROUND_ORDER = [ROUND_R32, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F];

export type RoundRecord = {
  code: string;
  labelEn: string;
  labelKo: string;
  sortOrder: number;
};

export async function getRounds(): Promise<RoundRecord[]> {
  noStore();
  const rows = await prisma.round.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({ code: r.code, labelEn: r.labelEn, labelKo: r.labelKo, sortOrder: r.sortOrder }));
}