import { prisma } from "@/lib/prisma";

async function nextTeamId(tournamentYear: number, categoryId: string): Promise<string> {
  const existing = await prisma.team.findMany({
    where: { tournamentYear, categoryId },
    select: { id: true },
  });
  const used = new Set(existing.map((t) => parseInt(t.id.match(/(\d+)$/)?.[1] ?? "0", 10)));
  let n = 1;
  while (used.has(n)) n++;
  return `${tournamentYear}${categoryId}${n}`;
}

export const MIN_TEAMS_FOR_ACTIVE = 4;

export async function activateCategoryIfThresholdMet(tournamentYear: number, categoryId: string): Promise<void> {
  const teamCount = await prisma.team.count({ where: { tournamentYear, categoryId } });
  const activeRegCount = await prisma.tournamentRegistration.count({
    where: { tournamentYear, categoryId, NOT: { status: "Cancelled" } },
  });
  if (teamCount >= MIN_TEAMS_FOR_ACTIVE && activeRegCount > 0) {
    await prisma.categoryYearStatus.updateMany({
      where: { tournamentYear, categoryId, status: "Pending" },
      data: { status: "Active" },
    });
  }
}

export async function renumberTeamsInCategory(tournamentYear: number, categoryId: string): Promise<void> {
  const teams = await prisma.team.findMany({
    where: { tournamentYear, categoryId },
  });
  teams.sort((a, b) => {
    const na = parseInt(a.id.match(/(\d+)$/)?.[1] ?? "0", 10);
    const nb = parseInt(b.id.match(/(\d+)$/)?.[1] ?? "0", 10);
    return na - nb;
  });
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const finalId = `${tournamentYear}${categoryId}${i + 1}`;
    if (team.id === finalId) continue;
    await prisma.match.updateMany({ where: { tournamentYear, team1Id: team.id }, data: { team1Id: finalId } });
    await prisma.match.updateMany({ where: { tournamentYear, team2Id: team.id }, data: { team2Id: finalId } });
    await prisma.team.delete({ where: { tournamentYear_id: { tournamentYear, id: team.id } } });
    await prisma.team.create({
      data: { id: finalId, tournamentYear, categoryId, seed: team.seed, member1PlayerId: team.member1PlayerId, member2PlayerId: team.member2PlayerId },
    });
  }
}

export async function createTeamFromRegistration({
  tournamentYear,
  categoryId,
  playerId,
  partnerId,
}: {
  tournamentYear: number;
  categoryId: string;
  playerId: number;
  partnerId: number | null;
}): Promise<void> {
  let m1: number;
  let m2: number | null;

  if (partnerId != null && categoryId.startsWith("XD")) {
    // For mixed doubles: assign member1 = male, member2 = female.
    const players = await prisma.player.findMany({
      where: { id: { in: [playerId, partnerId] } },
      select: { id: true, gender: true },
    });
    const byId = new Map(players.map((p) => [p.id, p.gender]));
    const pGender = byId.get(playerId);
    const partnerGender = byId.get(partnerId);

    if (pGender === "M" && partnerGender === "F") {
      m1 = playerId; m2 = partnerId;
    } else if (pGender === "F" && partnerGender === "M") {
      m1 = partnerId; m2 = playerId;
    } else {
      // Same gender or unknown — fall back to min/max by ID
      m1 = Math.min(playerId, partnerId);
      m2 = Math.max(playerId, partnerId);
    }
  } else {
    [m1, m2] = partnerId != null ? [playerId, partnerId] : [playerId, null];
  }

  const existing = await prisma.team.findFirst({
    where: {
      tournamentYear,
      categoryId,
      OR:
        m2 != null
          ? [
              { member1PlayerId: m1, member2PlayerId: m2 },
              { member1PlayerId: m2, member2PlayerId: m1 },
            ]
          : [{ member1PlayerId: m1, member2PlayerId: null }],
    },
    select: { id: true },
  });

  if (existing) return;

  try {
    await prisma.team.create({
      data: {
        id: await nextTeamId(tournamentYear, categoryId),
        tournamentYear,
        categoryId,
        member1PlayerId: m1,
        member2PlayerId: m2,
      },
    });
  } catch {
    // Race condition: another request created the same team concurrently — safe to ignore.
  }
}
