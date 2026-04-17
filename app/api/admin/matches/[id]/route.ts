import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH — update match (scores, date, time, location, status, teams, round, etc.). */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    const str = (v: unknown) => (v == null ? null : typeof v === "string" ? v.trim() || null : String(v));
    const num = (v: unknown) => (v == null ? null : Number(v));

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
    if (body.matchNumber !== undefined) data.matchNumber = num(body.matchNumber);
    if (body.team1Id !== undefined) data.team1Id = str(body.team1Id);
    if (body.team2Id !== undefined) data.team2Id = str(body.team2Id);
    if (body.matchStatus !== undefined) data.matchStatus = str(body.matchStatus) || "Scheduled";
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

    if (Object.keys(data).length === 0) return NextResponse.json({ id });

    await prisma.match.update({
      where: { id },
      data: data as Parameters<typeof prisma.match.update>[0]["data"],
    });
    return NextResponse.json({ id });
  } catch (e) {
    console.error("PATCH /api/admin/matches/[id]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

/** DELETE — remove a match. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.match.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/admin/matches/[id]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
