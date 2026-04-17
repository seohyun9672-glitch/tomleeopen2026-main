import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/matches/[id] — update match (admin). Updates schedule/results/draw on frontend. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    const str = (v: unknown) => (v == null ? null : typeof v === "string" ? v.trim() || null : String(v));

    if (body.roundCode !== undefined || body.round !== undefined) {
      const rawCode = str(body.roundCode ?? body.round);
      if (rawCode) {
        const roundRecord = await prisma.round.findUnique({ where: { code: rawCode } });
        if (!roundRecord) {
          return NextResponse.json({ error: `Unknown round code: ${rawCode}` }, { status: 400 });
        }
        data.roundId = roundRecord.id;
      } else {
        data.roundId = null;
      }
    }

    if (body.matchNumber !== undefined) data.matchNumber = body.matchNumber != null ? Number(body.matchNumber) : null;
    if (body.team1Id !== undefined) data.team1Id = str(body.team1Id);
    if (body.team2Id !== undefined) data.team2Id = str(body.team2Id);
    if (body.matchStatus !== undefined) data.matchStatus = typeof body.matchStatus === "string" ? body.matchStatus.trim() : "Scheduled";
    if (body.date !== undefined) data.date = str(body.date);
    if (body.time !== undefined) data.time = str(body.time);
    if (body.location !== undefined) data.location = str(body.location);
    if (body.set1ScoreTeam1 !== undefined) data.set1ScoreTeam1 = str(body.set1ScoreTeam1);
    if (body.set2ScoreTeam1 !== undefined) data.set2ScoreTeam1 = str(body.set2ScoreTeam1);
    if (body.set3ScoreTeam1 !== undefined) data.set3ScoreTeam1 = str(body.set3ScoreTeam1);
    if (body.set1ScoreTeam2 !== undefined) data.set1ScoreTeam2 = str(body.set1ScoreTeam2);
    if (body.set2ScoreTeam2 !== undefined) data.set2ScoreTeam2 = str(body.set2ScoreTeam2);
    if (body.set3ScoreTeam2 !== undefined) data.set3ScoreTeam2 = str(body.set3ScoreTeam2);
    if (body.comment !== undefined) data.comment = str(body.comment);

    if (Object.keys(data).length > 0) {
      await prisma.match.update({
        where: { id },
        data: data as Parameters<typeof prisma.match.update>[0]["data"],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/matches/[id]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
