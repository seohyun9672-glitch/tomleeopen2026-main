import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategories, isDoublesCategory } from "@/lib/categories";
import { isEffectivelyCancelled } from "@/lib/registrationStatus";

export const dynamic = "force-dynamic";

/** GET ?year=2026&categoryId=MD-B — list teams for year and category. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const categoryId = searchParams.get("categoryId");
  const tournamentYear = year ? parseInt(year, 10) : null;
  if (!Number.isFinite(tournamentYear) || !categoryId?.trim()) {
    return NextResponse.json(
      { error: "year and categoryId are required" },
      { status: 400 }
    );
  }
  try {
    const teams = await prisma.team.findMany({
      where: { tournamentYear: tournamentYear!, categoryId: categoryId.trim() },
      include: {
        member1: { select: { id: true, fullNameEn: true, fullNameKo: true } },
        member2: { select: { id: true, fullNameEn: true, fullNameKo: true } },
      },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(teams);
  } catch (e) {
    console.error("GET /api/admin/teams", e);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

/** POST — populate teams from registrations for a year (all categories), or create one team. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "populate") {
      const tournamentYear = Number(body.tournamentYear) || new Date().getFullYear();
      const categories = await getCategories();
      const idToLabel = new Map(categories.map((c) => [c.id, c.label]));

      const regs = await prisma.tournamentRegistration.findMany({
        where: { tournamentYear },
        include: {
          player: { select: { id: true } },
          partner: { select: { id: true } },
        },
        orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
      });

      const used = new Set<string>();
      const teamsByCategory = new Map<
        string,
        { member1PlayerId: number; member2PlayerId: number | null }[]
      >();

      for (const reg of regs) {
        if (isEffectivelyCancelled(reg.status, reg.notes)) continue;
        if (used.has(reg.id)) continue;
        const label = idToLabel.get(reg.categoryId) ?? "";

        if (isDoublesCategory(label)) {
          const other =
            reg.partnerId != null &&
            reg.partner &&
            regs.find(
              (r) =>
                r.categoryId === reg.categoryId &&
                r.id !== reg.id &&
                !used.has(r.id) &&
                r.playerId === reg.partnerId &&
                r.partnerId === reg.playerId
            );
          if (other) {
            used.add(reg.id);
            used.add(other.id);
            const list = teamsByCategory.get(reg.categoryId) ?? [];
            list.push({ member1PlayerId: reg.playerId, member2PlayerId: reg.partnerId });
            teamsByCategory.set(reg.categoryId, list);
          } else {
            used.add(reg.id);
            const list = teamsByCategory.get(reg.categoryId) ?? [];
            list.push({ member1PlayerId: reg.playerId, member2PlayerId: null });
            teamsByCategory.set(reg.categoryId, list);
          }
        } else {
          used.add(reg.id);
          const list = teamsByCategory.get(reg.categoryId) ?? [];
          list.push({ member1PlayerId: reg.playerId, member2PlayerId: null });
          teamsByCategory.set(reg.categoryId, list);
        }
      }

      // Fetch all existing teams for the year in one query, then batch writes.
      const existingTeams = await prisma.team.findMany({
        where: { tournamentYear },
        select: { id: true },
      });
      const existingIds = new Set(existingTeams.map((t) => t.id));

      let created = 0;
      let updated = 0;
      const ops: ReturnType<typeof prisma.team.update | typeof prisma.team.create>[] = [];

      for (const [catId, members] of teamsByCategory) {
        let number = 0;
        for (const { member1PlayerId, member2PlayerId } of members) {
          number++;
          const id = `${catId}${number}`;
          if (existingIds.has(id)) {
            ops.push(
              prisma.team.update({
                where: { tournamentYear_id: { tournamentYear, id } },
                data: { member1PlayerId, member2PlayerId },
              })
            );
            updated++;
          } else {
            ops.push(
              prisma.team.create({
                data: { id, tournamentYear, categoryId: catId, member1PlayerId, member2PlayerId },
              })
            );
            created++;
          }
        }
      }

      await prisma.$transaction(ops);
      return NextResponse.json({ created, updated });
    }

    const tournamentYear = Number(body.tournamentYear);
    const categoryId = body.categoryId?.trim();
    const member1PlayerId = Number(body.member1PlayerId);
    const member2PlayerId = body.member2PlayerId != null ? Number(body.member2PlayerId) : null;
    const seed = body.seed?.trim() || null;

    if (!Number.isFinite(tournamentYear) || !categoryId || !Number.isFinite(member1PlayerId)) {
      return NextResponse.json(
        { error: "tournamentYear, categoryId, and member1PlayerId are required" },
        { status: 400 }
      );
    }

    const existingTeams = await prisma.team.findMany({
      where: { tournamentYear, categoryId },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const nextNum = existingTeams.length + 1;
    const id = `${categoryId}${nextNum}`;

    await prisma.team.create({
      data: {
        id,
        tournamentYear,
        categoryId,
        seed,
        member1PlayerId,
        member2PlayerId,
      },
    });
    return NextResponse.json({ id, tournamentYear, categoryId });
  } catch (e) {
    console.error("POST /api/admin/teams", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
