import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseClubCodesFromBody } from "@/lib/clubs";

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

/** POST /api/players — create a new player (admin). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullNameEn = typeof body.fullNameEn === "string" ? body.fullNameEn.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!fullNameEn) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await prisma.player.findFirst({ where: { email } });
    if (existing) return NextResponse.json({ error: "A player with this email already exists" }, { status: 409 });

    const player = await prisma.player.create({
      data: {
        fullNameEn,
        email,
        fullNameKo: body.fullNameKo?.trim() || null,
        phone: body.phone?.trim() || null,
        ntrp: body.ntrp?.trim() || null,
      },
    });

    const clubCodes = parseClubCodesFromBody(body.clubs);
    if (clubCodes.length > 0) {
      const validClubs = await prisma.club.findMany({
        where: { code: { in: clubCodes } },
        select: { code: true },
      });
      const ok = new Set(validClubs.map((c) => c.code));
      await prisma.playerClub.createMany({
        data: clubCodes.filter((c) => ok.has(c)).map((clubCode) => ({ playerId: player.id, clubCode })),
      });
    }

    return NextResponse.json({ ok: true, playerId: player.id });
  } catch (e) {
    console.error("POST /api/players", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
