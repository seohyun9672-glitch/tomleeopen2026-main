import { prisma } from "@/lib/prisma";

async function nextTeamId(tournamentYear: number, categoryId: string): Promise<string> {
  const existing = await prisma.team.findMany({
    where: { tournamentYear, categoryId },
    select: { id: true },
  });
  const max = existing.reduce((m, t) => {
    const n = parseInt(t.id.match(/(\d+)$/)?.[1] ?? "0", 10);
    return Math.max(m, n);
  }, 0);
  return `${tournamentYear}${categoryId}${max + 1}`;
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
    [m1, m2] =
      partnerId != null
        ? [Math.min(playerId, partnerId), Math.max(playerId, partnerId)]
        : [playerId, null];
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
