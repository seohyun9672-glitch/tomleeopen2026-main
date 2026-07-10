import { prisma } from "@/lib/prisma";

export async function getRegistrationCount(year = 2026): Promise<number> {
  return prisma.tournamentRegistration.count({
    where: { tournamentYear: year, status: { not: "Cancelled" } },
  });
}

export async function isSeedingComplete(year = 2026): Promise<boolean> {
  const [total, unseeded] = await Promise.all([
    prisma.team.count({ where: { tournamentYear: year } }),
    prisma.team.count({ where: { tournamentYear: year, seed: null } }),
  ]);
  return total > 0 && unseeded === 0;
}
