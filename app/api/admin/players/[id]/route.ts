import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseClubCodesFromBody } from "@/lib/clubs";
import { normalizeNtrpForStorage } from "@/lib/ntrpFormat";

export const dynamic = "force-dynamic";

async function setPlayerClubs(playerId: number, clubCodes: string[]) {
  await prisma.playerClub.deleteMany({ where: { playerId } });
  if (clubCodes.length === 0) return;
  await prisma.playerClub.createMany({
    data: clubCodes.map((clubCode) => ({ playerId, clubCode })),
  });
}

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/players/[id] — update player profile (admin). */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
    }
    const body = await request.json();
    const existing = await prisma.player.findUnique({ where: { id: playerId } });
    if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    await prisma.player.update({
      where: { id: playerId },
      data: {
        ...(typeof body.fullNameEn === "string" && { fullNameEn: body.fullNameEn.trim() }),
        ...(body.fullNameKo !== undefined && { fullNameKo: body.fullNameKo?.trim() || null }),
        ...(typeof body.email === "string" && { email: body.email.trim().toLowerCase() }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.ntrp !== undefined && { ntrp: normalizeNtrpForStorage(body.ntrp) }),
      },
    });
    if (body.clubs !== undefined) {
      const requested = parseClubCodesFromBody(body.clubs);
      const existing =
        requested.length > 0
          ? await prisma.club.findMany({
              where: { code: { in: requested } },
              select: { code: true },
            })
          : [];
      const ok = new Set(existing.map((c) => c.code));
      await setPlayerClubs(playerId, requested.filter((code) => ok.has(code)));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/players/[id]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/admin/players/[id] — delete player (cascades registrations per schema). */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
    }
    await prisma.player.delete({ where: { id: playerId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/players/[id]", e);
    return NextResponse.json({ error: "Delete failed — player may still be referenced by teams or matches." }, { status: 500 });
  }
}
