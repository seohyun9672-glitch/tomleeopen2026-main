import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { autoFillKnockoutSlots, autoAdvanceKnockout } from "@/lib/generateMatches";
import { computeMatchStatus } from "@/lib/matches";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const current = await prisma.match.findUnique({
      where: { id },
      select: {
        matchStatus: true,
        date: true, time: true, location: true,
        set1ScoreTeam1: true, set1ScoreTeam2: true,
        set2ScoreTeam1: true, set2ScoreTeam2: true,
      },
    });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if ("date" in body) data.date = body.date || null;
    if ("time" in body) data.time = body.time || null;
    if ("location" in body) data.location = body.location || null;
    if ("comment" in body) data.comment = body.comment || null;
    if ("ball" in body) data.ball = body.ball || null;
    if (typeof body.ballReceived === "boolean") data.ballReceived = body.ballReceived;
    if ("set1ScoreTeam1" in body) data.set1ScoreTeam1 = body.set1ScoreTeam1 || null;
    if ("set2ScoreTeam1" in body) data.set2ScoreTeam1 = body.set2ScoreTeam1 || null;
    if ("set3ScoreTeam1" in body) data.set3ScoreTeam1 = body.set3ScoreTeam1 || null;
    if ("set1ScoreTeam2" in body) data.set1ScoreTeam2 = body.set1ScoreTeam2 || null;
    if ("set2ScoreTeam2" in body) data.set2ScoreTeam2 = body.set2ScoreTeam2 || null;
    if ("set3ScoreTeam2" in body) data.set3ScoreTeam2 = body.set3ScoreTeam2 || null;

    const isCancelled = typeof body.matchStatus === "string" && /^cancell?ed$/i.test(body.matchStatus);
    data.matchStatus = isCancelled ? "Cancelled" : computeMatchStatus(
      current.matchStatus,
      ("date" in body ? body.date || null : current.date),
      ("time" in body ? body.time || null : current.time),
      ("location" in body ? body.location || null : current.location),
      ("set1ScoreTeam1" in body ? body.set1ScoreTeam1 || null : current.set1ScoreTeam1),
      ("set1ScoreTeam2" in body ? body.set1ScoreTeam2 || null : current.set1ScoreTeam2),
      ("set2ScoreTeam1" in body ? body.set2ScoreTeam1 || null : current.set2ScoreTeam1),
      ("set2ScoreTeam2" in body ? body.set2ScoreTeam2 || null : current.set2ScoreTeam2),
    );

    const updated = await prisma.match.update({
      where: { id },
      data,
      select: { tournamentYear: true, categoryId: true, round: true, matchStatus: true },
    });

    if (updated.matchStatus === "Completed") {
      if (updated.round === "PRE") {
        // All prelims in a group completed → fill QF/SF slots
        const yearStatus = await prisma.categoryYearStatus.findUnique({
          where: { tournamentYear_categoryId: { tournamentYear: updated.tournamentYear, categoryId: updated.categoryId } },
          select: { prelimFormat: true },
        });
        if (yearStatus?.prelimFormat) {
          await autoFillKnockoutSlots(updated.tournamentYear, updated.categoryId, yearStatus.prelimFormat);
        }
      } else {
        // Knockout match completed → advance winner to next round
        await autoAdvanceKnockout(id, updated.tournamentYear, updated.categoryId);
      }
    }

    revalidateTag("all-matches", "default");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/matches/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
