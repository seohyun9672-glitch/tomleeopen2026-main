import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Available tournament years across registrations, teams, and matches.
 * Cached for 5 minutes — shared across draws, categories, and honour-roll pages.
 */
export const getAvailableYears = unstable_cache(
  async function getAvailableYears() {
    const [regRows, teamRows, matchRows] = await Promise.all([
      prisma.tournamentRegistration.findMany({
        select: { tournamentYear: true },
        distinct: ["tournamentYear"],
        orderBy: { tournamentYear: "desc" },
      }),
      prisma.team.findMany({
        select: { tournamentYear: true },
        distinct: ["tournamentYear"],
        orderBy: { tournamentYear: "desc" },
      }),
      prisma.match.findMany({
        select: { tournamentYear: true },
        distinct: ["tournamentYear"],
        orderBy: { tournamentYear: "desc" },
      }),
    ]);
    const allYears = [
      ...new Set([...regRows, ...teamRows, ...matchRows].map((r) => r.tournamentYear)),
    ].sort((a, b) => b - a);
    const yearsWithMatches = [...new Set(matchRows.map((r) => r.tournamentYear))].sort(
      (a, b) => b - a
    );
    return { allYears, yearsWithMatches };
  },
  ["available-years"],
  { revalidate: 300 }
);
