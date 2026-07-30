import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/media/[id] — admin-only, updates an Article/Video/Photo row. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    if ("titleKo" in body) data.titleKo = body.titleKo?.trim() || null;
    if ("subtitle" in body) data.subtitle = body.subtitle?.trim() || null;
    if ("subtitleKo" in body) data.subtitleKo = body.subtitleKo?.trim() || null;
    if ("image" in body) data.image = body.image?.trim() || null;
    if ("media" in body) data.media = body.media?.trim() || null;
    if ("date" in body) data.date = body.date ? new Date(body.date) : null;
    if ("outlet" in body) data.outlet = body.outlet?.trim() || null;
    if ("outletKo" in body) data.outletKo = body.outletKo?.trim() || null;
    if ("categoryId" in body) data.categoryId = body.categoryId?.trim() || null;
    if ("sortOrder" in body) data.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    if ("tournamentYear" in body) data.tournamentYear = body.tournamentYear ? Number(body.tournamentYear) : null;

    await prisma.media.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/media/[id]", e);
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
  }
}

/** DELETE /api/media/[id] — admin-only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/media/[id]", e);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
