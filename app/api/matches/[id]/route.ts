import { NextResponse } from "next/server";
import { matchRoundForPrisma } from "@/lib/matchRoundCode";
import { prisma } from "@/lib/prisma";

/** PATCH /api/matches/[id] — update match (admin). Updates schedule/results/draw on frontend. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    await prisma.match.update({
      where: { id },
      data: {
        ...(body.round !== undefined && {
          round: (() => {
            const r = typeof body.round === "string" ? body.round.trim() : "";
            return r ? matchRoundForPrisma(r) : null;
          })(),
        }),
        ...(body.matchNumber !== undefined && { matchNumber: body.matchNumber != null ? Number(body.matchNumber) : null }),
        ...(body.team1Id !== undefined && { team1Id: body.team1Id?.trim() || null }),
        ...(body.team2Id !== undefined && { team2Id: body.team2Id?.trim() || null }),
        ...(body.matchStatus !== undefined && { matchStatus: typeof body.matchStatus === "string" ? body.matchStatus.trim() : "Scheduled" }),
        ...(body.date !== undefined && { date: body.date?.trim() || null }),
        ...(body.time !== undefined && { time: body.time?.trim() || null }),
        ...(body.location !== undefined && { location: body.location?.trim() || null }),
        ...(body.set1ScoreTeam1 !== undefined && { set1ScoreTeam1: body.set1ScoreTeam1?.trim() || null }),
        ...(body.set2ScoreTeam1 !== undefined && { set2ScoreTeam1: body.set2ScoreTeam1?.trim() || null }),
        ...(body.set3ScoreTeam1 !== undefined && { set3ScoreTeam1: body.set3ScoreTeam1?.trim() || null }),
        ...(body.set1ScoreTeam2 !== undefined && { set1ScoreTeam2: body.set1ScoreTeam2?.trim() || null }),
        ...(body.set2ScoreTeam2 !== undefined && { set2ScoreTeam2: body.set2ScoreTeam2?.trim() || null }),
        ...(body.set3ScoreTeam2 !== undefined && { set3ScoreTeam2: body.set3ScoreTeam2?.trim() || null }),
        ...(body.comment !== undefined && { comment: body.comment?.trim() || null }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/matches/[id]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
