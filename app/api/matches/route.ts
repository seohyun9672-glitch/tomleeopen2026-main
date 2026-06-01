import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function extractGroup(matchId: string): string | null {
  const m = matchId.match(/PRE([A-Z])(\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

/** GET /api/matches?year=&categoryId= — list all matches with team/player info. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const categoryId = url.searchParams.get("categoryId");

    const rows = await prisma.match.findMany({
      where: {
        ...(year ? { tournamentYear: parseInt(year, 10) } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { label: true, labelKo: true } },
        round: { select: { code: true, labelEn: true } },
        team1: {
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
          },
        },
        team2: {
          include: {
            member1: { select: { fullNameEn: true, fullNameKo: true } },
            member2: { select: { fullNameEn: true, fullNameKo: true } },
          },
        },
      },
      orderBy: [{ tournamentYear: "desc" }, { categoryId: "asc" }, { matchNumber: "asc" }],
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        tournamentYear: r.tournamentYear,
        categoryId: r.categoryId,
        categoryLabel: r.category.label,
        categoryLabelKo: r.category.labelKo,
        roundCode: r.round?.code ?? null,
        roundLabel: r.round?.labelEn ?? null,
        group: extractGroup(r.id),
        team1Names: r.team1
          ? [r.team1.member1.fullNameEn, r.team1.member2?.fullNameEn ?? null].filter(Boolean)
          : [],
        team1NamesKo: r.team1
          ? ([
              r.team1.member1.fullNameKo?.trim() || r.team1.member1.fullNameEn.trim(),
              r.team1.member2 ? (r.team1.member2.fullNameKo?.trim() || r.team1.member2.fullNameEn.trim()) : null,
            ].filter(Boolean) as string[])
          : [],
        team2Names: r.team2
          ? [r.team2.member1.fullNameEn, r.team2.member2?.fullNameEn ?? null].filter(Boolean)
          : [],
        team2NamesKo: r.team2
          ? ([
              r.team2.member1.fullNameKo?.trim() || r.team2.member1.fullNameEn.trim(),
              r.team2.member2 ? (r.team2.member2.fullNameKo?.trim() || r.team2.member2.fullNameEn.trim()) : null,
            ].filter(Boolean) as string[])
          : [],
        matchStatus: r.matchStatus,
        date: r.date,
        time: r.time,
        location: r.location,
        set1T1: r.set1ScoreTeam1,
        set2T1: r.set2ScoreTeam1,
        set3T1: r.set3ScoreTeam1,
        set1T2: r.set1ScoreTeam2,
        set2T2: r.set2ScoreTeam2,
        set3T2: r.set3ScoreTeam2,
        comment: r.comment,
      }))
    );
  } catch (e) {
    console.error("GET /api/matches", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
