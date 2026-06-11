import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoFillKnockoutSlots } from "@/lib/generateMatches";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.matchStatus === "string") data.matchStatus = body.matchStatus;
    if ("date" in body) data.date = body.date || null;
    if ("time" in body) data.time = body.time || null;
    if ("location" in body) data.location = body.location || null;
    if ("comment" in body) data.comment = body.comment || null;
    if ("ball" in body) data.ball = body.ball || null;
    if ("set1ScoreTeam1" in body) data.set1ScoreTeam1 = body.set1ScoreTeam1 || null;
    if ("set2ScoreTeam1" in body) data.set2ScoreTeam1 = body.set2ScoreTeam1 || null;
    if ("set3ScoreTeam1" in body) data.set3ScoreTeam1 = body.set3ScoreTeam1 || null;
    if ("set1ScoreTeam2" in body) data.set1ScoreTeam2 = body.set1ScoreTeam2 || null;
    if ("set2ScoreTeam2" in body) data.set2ScoreTeam2 = body.set2ScoreTeam2 || null;
    if ("set3ScoreTeam2" in body) data.set3ScoreTeam2 = body.set3ScoreTeam2 || null;

    const updated = await prisma.match.update({
      where: { id },
      data,
      select: { tournamentYear: true, categoryId: true, round: true, matchStatus: true },
    });

    // Auto-fill knockout slots when a prelim match is marked Completed
    if (updated.round === "PRE" && updated.matchStatus === "Completed") {
      const category = await prisma.category.findUnique({
        where: { id: updated.categoryId },
        select: { prelimFormat: true },
      });
      if (category?.prelimFormat) {
        await autoFillKnockoutSlots(updated.tournamentYear, updated.categoryId, category.prelimFormat);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/matches/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
