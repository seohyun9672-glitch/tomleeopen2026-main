import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NAME_SEARCH_TAKE = 50;

/**
 * GET /api/players?email=... or /api/players?name=... — find players for registration prefill.
 * Returns array of players with profile fields; empty if no match.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const name = searchParams.get("name")?.trim();
  const nameLower = name?.toLowerCase() ?? "";
  const hasEmail = Boolean(email && email.length >= 2);
  const hasName = Boolean(name && name.length >= 1);
  try {
    const rawPlayers = await prisma.player.findMany({
      where: hasEmail
        ? { email }
        : {},
      select: {
        id: true,
        fullNameEn: true,
        fullNameKo: true,
        email: true,
        phone: true,
        ntrp: true,
      },
      orderBy: { fullNameEn: "asc" },
      take: hasEmail ? NAME_SEARCH_TAKE : hasName ? 500 : 5,
    });
    const players = hasName
      ? rawPlayers
          .filter((p) => {
            const en = p.fullNameEn?.toLowerCase() ?? "";
            const ko = p.fullNameKo?.toLowerCase() ?? "";
            return en.includes(nameLower) || ko.includes(nameLower);
          })
          .slice(0, NAME_SEARCH_TAKE)
      : rawPlayers;
    if (players.length === 0) return NextResponse.json([]);

    const playerIds = players.map((p) => p.id);
    const playerClubRows = await prisma.playerClub.findMany({
      where: { playerId: { in: playerIds } },
      select: { playerId: true, clubCode: true },
    });
    const clubsByPlayerId = new Map<number, string[]>();
    for (const row of playerClubRows) {
      const list = clubsByPlayerId.get(row.playerId) ?? [];
      list.push(row.clubCode);
      clubsByPlayerId.set(row.playerId, list);
    }

    return NextResponse.json(
      players.map((p) => ({
        ...p,
        clubs: clubsByPlayerId.get(p.id) ?? [],
      }))
    );
  } catch (e) {
    console.error("GET /api/players", e);
    return NextResponse.json([], { status: 500 });
  }
}
