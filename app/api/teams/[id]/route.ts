import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateMatches } from "@/lib/generateMatches";
import { renumberTeamsInCategory, MIN_TEAMS_FOR_ACTIVE } from "@/lib/createTeam";

async function revertCategoryStatusIfUnderThreshold(tournamentYear: number, categoryId: string) {
  const teamCount = await prisma.team.count({ where: { tournamentYear, categoryId } });
  if (teamCount < MIN_TEAMS_FOR_ACTIVE) {
    await prisma.categoryYearStatus.updateMany({
      where: { tournamentYear, categoryId, NOT: { status: "Pending" } },
      data: { status: "Pending" },
    });
  }
}

/** DELETE /api/teams/[id]?year= — remove a team and recheck category status. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tournamentYear = parseInt(searchParams.get("year") ?? "", 10);
    if (isNaN(tournamentYear)) return NextResponse.json({ error: "year required" }, { status: 400 });

    const team = await prisma.team.findUnique({
      where: { tournamentYear_id: { tournamentYear, id } },
      select: { categoryId: true },
    });
    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.team.delete({ where: { tournamentYear_id: { tournamentYear, id } } });
    await renumberTeamsInCategory(tournamentYear, team.categoryId);
    await revertCategoryStatusIfUnderThreshold(tournamentYear, team.categoryId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/teams/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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
      // For GROUP_ROUND_ROBIN, a seed change means group assignments may have shifted.
      // Delete unplayed PRE matches so generateMatches can rebuild them with correct groupings.
      const yearStatus = await prisma.categoryYearStatus.findUnique({
        where: { tournamentYear_categoryId: { tournamentYear, categoryId: team.categoryId } },
        select: { prelimFormat: true },
      });
      if (yearStatus?.prelimFormat === "GROUP_ROUND_ROBIN") {
        await prisma.match.deleteMany({
          where: {
            tournamentYear,
            categoryId: team.categoryId,
            round: "PRE",
            matchStatus: "Pending",
            set1ScoreTeam1: null,
            set1ScoreTeam2: null,
          },
        });
      }
      await generateMatches(tournamentYear, team.categoryId);
      revalidateTag("all-matches", "default");
    }

    return NextResponse.json({ id });
  } catch (e) {
    console.error("PATCH /api/teams/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
