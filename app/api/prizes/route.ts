import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/prizes — create or update a prize record for a category+year. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tournamentYear = typeof body.tournamentYear === "number" ? body.tournamentYear : null;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : null;
    if (tournamentYear === null || !categoryId)
      return NextResponse.json({ error: "tournamentYear and categoryId required" }, { status: 400 });

    const data = {
      first:  typeof body.first  === "number" ? Math.max(0, Math.round(body.first))  : 0,
      second: typeof body.second === "number" ? Math.max(0, Math.round(body.second)) : 0,
      third:  typeof body.third  === "number" ? Math.max(0, Math.round(body.third))  : 0,
      fourth: typeof body.fourth === "number" ? Math.max(0, Math.round(body.fourth)) : 0,
    };

    const record = await prisma.categoryPrize.upsert({
      where: { tournamentYear_categoryId: { tournamentYear, categoryId } },
      update: data,
      create: { tournamentYear, categoryId, ...data },
    });

    return NextResponse.json(record);
  } catch (e) {
    console.error("POST /api/prizes", e);
    return NextResponse.json({ error: "Failed to upsert prize" }, { status: 500 });
  }
}

/** GET /api/prizes — fetch all prize records. */
export async function GET() {
  try {
    const prizes = await prisma.categoryPrize.findMany({
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }],
    });
    return NextResponse.json(prizes);
  } catch (e) {
    console.error("GET /api/prizes", e);
    return NextResponse.json({ error: "Failed to fetch prizes" }, { status: 500 });
  }
}
