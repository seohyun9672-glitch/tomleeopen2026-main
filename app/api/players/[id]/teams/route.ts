import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/players/[id]/teams?year= — teams a player belongs to for a given tournament year. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (!Number.isFinite(playerId) || playerId < 1) {
      return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") ?? String(getYear()),
      10
    );

    const teams = await prisma.team.findMany({
      where: {
        tournamentYear: year,
        OR: [{ member1PlayerId: playerId }, { member2PlayerId: playerId }],
      },
      include: {
        category: { select: { id: true, label: true, labelKo: true } },
        member1: { select: { fullNameEn: true, fullNameKo: true } },
        member2: { select: { fullNameEn: true, fullNameKo: true } },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(teams);
  } catch (e) {
    console.error("GET /api/players/[id]/teams", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
