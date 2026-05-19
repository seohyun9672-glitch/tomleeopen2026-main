import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NAME_SEARCH_TAKE = 50;

/**
 * GET /api/players?email=... or /api/players?name=... — find players for registration prefill.
 * Returns array of players with profile fields; empty if no match.
 */
/** POST /api/players — create a new player (admin). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullNameEn = typeof body.fullNameEn === "string" ? body.fullNameEn.trim() : "";
    if (!fullNameEn)
      return NextResponse.json({ error: "fullNameEn required" }, { status: 400 });

    const player = await prisma.player.create({
      data: {
        email: email || "",
        fullNameEn,
        fullNameKo: body.fullNameKo?.trim() || null,
        phone: body.phone?.trim() || null,
        ntrp: body.ntrp?.trim() || null,
      },
    });

    const clubs: string[] = Array.isArray(body.clubs) ? body.clubs : [];
    if (clubs.length > 0) {
      await prisma.playerClub.createMany({
        data: clubs.map((code: string) => ({ playerId: player.id, clubCode: code })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ id: player.id });
  } catch (e) {
    console.error("POST /api/players", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const name = searchParams.get("name")?.trim();
  const all = searchParams.get("all") === "1";
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
      take: all ? undefined : hasEmail ? NAME_SEARCH_TAKE : hasName ? 500 : 5,
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