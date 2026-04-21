import { NextResponse } from "next/server";
import { buildMatchId, matchIdUsesPrelimsSeedLetter, matchIdYearSuffix } from "@/lib/matches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET ?year=2026&categoryId=MD-B — list matches for year and optional category. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const categoryId = searchParams.get("categoryId")?.trim() || undefined;
  const tournamentYear = year ? parseInt(year, 10) : null;
  if (!Number.isFinite(tournamentYear)) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  try {
    const matches = await prisma.match.findMany({
      where: {
        tournamentYear: tournamentYear!,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        round: { select: { id: true, code: true, labelEn: true, labelKo: true, sortOrder: true } },
        team1: { include: { member1: { select: { fullNameEn: true, fullNameKo: true } }, member2: { select: { fullNameEn: true, fullNameKo: true } } } },
        team2: { include: { member1: { select: { fullNameEn: true, fullNameKo: true } }, member2: { select: { fullNameEn: true, fullNameKo: true } } } },
      },
      orderBy: [{ round: { sortOrder: "asc" } }, { matchNumber: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(matches);
  } catch (e) {
    console.error("GET /api/admin/matches", e);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

/** POST — create a match. Accepts `roundCode` (e.g. "Pre", "QF", "SF", "F", "R16"). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tournamentYear = Number(body.tournamentYear);
    const categoryId = body.categoryId?.trim();
    if (!Number.isFinite(tournamentYear) || !categoryId) {
      return NextResponse.json(
        { error: "tournamentYear and categoryId are required" },
        { status: 400 }
      );
    }

    const roundCodeRaw = (body.roundCode ?? body.round)?.toString().trim() || null;
    let roundId: number | null = null;
    if (roundCodeRaw) {
      const roundRecord = await prisma.round.findUnique({ where: { code: roundCodeRaw } });
      if (!roundRecord) {
        return NextResponse.json({ error: `Unknown round code: ${roundCodeRaw}` }, { status: 400 });
      }
      roundId = roundRecord.id;
    }

    const matchNumber = body.matchNumber != null ? Number(body.matchNumber) : null;
    const prelimsSeedLetterRaw =
      typeof body.prelimsSeedLetter === "string"
        ? body.prelimsSeedLetter
        : typeof body.seedLetter === "string"
          ? body.seedLetter
          : null;

    let id = body.id?.trim() || "";
    if (!id) {
      if (roundCodeRaw && matchNumber != null && Number.isFinite(matchNumber) && matchNumber >= 1) {
        if (matchIdUsesPrelimsSeedLetter(roundCodeRaw) && !String(prelimsSeedLetterRaw ?? "").trim()) {
          return NextResponse.json(
            { error: "prelimsSeedLetter or seedLetter is required for Pre rounds when id is omitted (e.g. A, B, or Pool A)" },
            { status: 400 }
          );
        }
        id = buildMatchId(tournamentYear, categoryId, roundCodeRaw, matchNumber, {
          prelimsSeedLetter: prelimsSeedLetterRaw,
        });
      } else {
        id = `${matchIdYearSuffix(tournamentYear)}${categoryId}UNK${Date.now()}`;
      }
    }

    const match = await prisma.match.create({
      data: {
        id,
        tournamentYear,
        categoryId,
        roundId,
        matchNumber,
        team1Id: body.team1Id?.trim() || null,
        team2Id: body.team2Id?.trim() || null,
        matchStatus: body.matchStatus?.trim() || "Scheduled",
        date: body.date?.trim() || null,
        time: body.time?.trim() || null,
        location: body.location?.trim() || null,
        set1ScoreTeam1: body.set1ScoreTeam1?.trim() || null,
        set2ScoreTeam1: body.set2ScoreTeam1?.trim() || null,
        set3ScoreTeam1: body.set3ScoreTeam1?.trim() || null,
        set1ScoreTeam2: body.set1ScoreTeam2?.trim() || null,
        set2ScoreTeam2: body.set2ScoreTeam2?.trim() || null,
        set3ScoreTeam2: body.set3ScoreTeam2?.trim() || null,
        comment: body.comment?.trim() || null,
      },
    });
    return NextResponse.json(match);
  } catch (e) {
    console.error("POST /api/admin/matches", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 }
    );
  }
}
