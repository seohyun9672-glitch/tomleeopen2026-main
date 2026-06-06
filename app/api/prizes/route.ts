import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/prizes — upsert a single prize bracket record. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tournamentYear = typeof body.tournamentYear === "number" ? body.tournamentYear : null;
    const isDoubles = typeof body.isDoubles === "boolean" ? body.isDoubles : null;
    const teamCountBracket = typeof body.teamCountBracket === "string" ? body.teamCountBracket : null;
    if (tournamentYear === null || isDoubles === null || !teamCountBracket)
      return NextResponse.json({ error: "tournamentYear, isDoubles, teamCountBracket required" }, { status: 400 });

    const data = {
      first:  typeof body.first  === "number" ? Math.max(0, Math.round(body.first))  : 0,
      second: typeof body.second === "number" ? Math.max(0, Math.round(body.second)) : 0,
      third:  typeof body.third  === "number" ? Math.max(0, Math.round(body.third))  : 0,
      fourth: typeof body.fourth === "number" ? Math.max(0, Math.round(body.fourth)) : 0,
    };

    const record = await prisma.categoryPrize.upsert({
      where: { tournamentYear_isDoubles_teamCountBracket: { tournamentYear, isDoubles, teamCountBracket } },
      update: data,
      create: { tournamentYear, isDoubles, teamCountBracket, ...data },
    });

    return NextResponse.json(record);
  } catch (e) {
    console.error("POST /api/prizes", e);
    return NextResponse.json({ error: "Failed to upsert prize" }, { status: 500 });
  }
}

/** GET /api/prizes — fetch all prize bracket records. */
export async function GET() {
  try {
    const prizes = await prisma.categoryPrize.findMany({
      orderBy: [{ tournamentYear: "desc" }, { isDoubles: "desc" }, { teamCountBracket: "asc" }],
    });
    return NextResponse.json(prizes);
  } catch (e) {
    console.error("GET /api/prizes", e);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}
