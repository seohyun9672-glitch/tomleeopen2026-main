import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateMatches } from "@/lib/generateMatches";
import { getYear } from "@/lib/utils";
import { hasDrawPublishDatePassed } from "@/lib/registrationStatus";

const VALID_FORMATS = ["GROUP_ROUND_ROBIN", "ROUND_ROBIN", "ELIMINATION"];

/** POST /api/teams/seed-bulk — set seeds for all teams in a category and trigger match generation. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const year = typeof body.year === "number" ? body.year : NaN;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const prelimFormat = typeof body.prelimFormat === "string" && VALID_FORMATS.includes(body.prelimFormat)
      ? body.prelimFormat
      : null;
    const seeds: { teamId: string; seed: string | null }[] = Array.isArray(body.seeds) ? body.seeds : [];

    if (isNaN(year) || !categoryId || !prelimFormat) {
      return NextResponse.json({ error: "year, categoryId, and prelimFormat required" }, { status: 400 });
    }

    if (year === getYear() && hasDrawPublishDatePassed()) {
      return NextResponse.json({ error: "Seeding is locked — draws have already been published" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.categoryYearStatus.update({
        where: { tournamentYear_categoryId: { tournamentYear: year, categoryId } },
        data: { prelimFormat },
      }),
      ...seeds.map(({ teamId, seed }) =>
        prisma.team.update({
          where: { tournamentYear_id: { tournamentYear: year, id: teamId } },
          data: { seed: typeof seed === "string" ? seed.trim() || null : null },
        })
      ),
    ]);

    const created = year === getYear() ? (await generateMatches(year, categoryId)).created : [];
    if (created.length > 0) revalidateTag("all-matches", "default");
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    console.error("POST /api/teams/seed-bulk", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
