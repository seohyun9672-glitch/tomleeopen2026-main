import { unstable_noStore as noStore } from "next/cache";

import { prisma } from "@/lib/prisma";

import type { CategoryRecord } from "./types";

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

/** Categories from Prisma — single source of truth. Manage in Prisma Studio. */
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
