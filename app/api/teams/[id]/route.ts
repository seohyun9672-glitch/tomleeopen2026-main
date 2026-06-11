import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMatches } from "@/lib/generateMatches";

/** PATCH /api/teams/[id]?year= — update team fields (admin). Triggers match generation on seed change. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tournamentYear = parseInt(searchParams.get("year") ?? "", 10);
    if (isNaN(tournamentYear)) return NextResponse.json({ error: "year required" }, { status: 400 });

    const body = await request.json();
    const seed = typeof body.seed === "string" ? body.seed.trim() || null : body.seed === null ? null : undefined;

    const team = await prisma.team.update({
      where: { tournamentYear_id: { tournamentYear, id } },
      data: { ...(seed !== undefined ? { seed } : {}) },
      select: { categoryId: true },
    });

    if (seed !== undefined) {
      await generateMatches(tournamentYear, team.categoryId);
    }

    return NextResponse.json({ id });
  } catch (e) {
    console.error("PATCH /api/teams/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
