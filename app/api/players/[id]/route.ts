import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (!Number.isFinite(playerId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.fullNameEn === "string") data.fullNameEn = body.fullNameEn.trim();
    if ("fullNameKo" in body) data.fullNameKo = body.fullNameKo?.trim() || null;
    if (typeof body.email === "string") data.email = body.email.trim().toLowerCase();
    if ("phone" in body) data.phone = body.phone?.trim() || null;
    if ("ntrp" in body) data.ntrp = body.ntrp?.trim() || null;

    await prisma.player.update({ where: { id: playerId }, data });

    if (Array.isArray(body.clubs)) {
      await prisma.playerClub.deleteMany({ where: { playerId } });
      if (body.clubs.length > 0) {
        await prisma.playerClub.createMany({
          data: (body.clubs as string[]).map((code) => ({ playerId, clubCode: code })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/players/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (!Number.isFinite(playerId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.player.delete({ where: { id: playerId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/players/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
