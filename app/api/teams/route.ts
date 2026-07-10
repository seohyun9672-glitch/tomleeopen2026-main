import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/teams?playerName=&year= — find teams that include a player matching the name query.
 * Used by the court booking team combobox.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerName = searchParams.get("playerName")?.trim() ?? "";
  const year = parseInt(
    searchParams.get("year") ?? String(getYear()),
    10
  );

  if (playerName.length < 1) return NextResponse.json([]);

  try {
    const nameLower = playerName.toLowerCase();

    const players = await prisma.player.findMany({
      where: {},
      select: { id: true, fullNameEn: true, fullNameKo: true },
      take: 300,
    });

    const matchedIds = players
      .filter(
        (p) =>
          p.fullNameEn.toLowerCase().includes(nameLower) ||
          (p.fullNameKo ?? "").toLowerCase().includes(nameLower)
      )
      .map((p) => p.id);

    if (matchedIds.length === 0) return NextResponse.json([]);

    const teams = await prisma.team.findMany({
      where: {
        tournamentYear: year,
        OR: [
          { member1PlayerId: { in: matchedIds } },
          { member2PlayerId: { in: matchedIds } },
        ],
      },
      include: {
        category: { select: { label: true, labelKo: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(teams);
  } catch (e) {
    console.error("GET /api/teams", e);
    return NextResponse.json([], { status: 500 });
  }
}
