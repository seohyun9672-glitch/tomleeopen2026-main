import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PATCH ?tournamentYear=2026&teamId=D-B1 — update team seed or members. */
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentYearParam = searchParams.get("tournamentYear");
  const teamId = searchParams.get("teamId");
  const tournamentYear = tournamentYearParam ? parseInt(tournamentYearParam, 10) : null;
  if (!Number.isFinite(tournamentYear) || !teamId?.trim()) {
    return NextResponse.json(
      { error: "tournamentYear and teamId are required" },
      { status: 400 }
    );
  }
  try {
    const body = await request.json();
    const updateData: { seed?: string | null; member1PlayerId?: number; member2PlayerId?: number | null } = {};
    if (body.seed !== undefined) updateData.seed = body.seed?.trim() || null;
    if (body.member1PlayerId !== undefined) updateData.member1PlayerId = Number(body.member1PlayerId);
    if (body.member2PlayerId !== undefined) updateData.member2PlayerId = body.member2PlayerId == null ? null : Number(body.member2PlayerId);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: true });
    }

    await prisma.team.update({
      where: { tournamentYear_id: { tournamentYear: tournamentYear!, id: teamId.trim() } },
      data: updateData,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/teams/update", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
