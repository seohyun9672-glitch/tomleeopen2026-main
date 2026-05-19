import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.status === "string") data.status = body.status;
    if ("notes" in body) data.notes = body.notes?.trim() || null;
    if ("nameOnEtransfer" in body) data.nameOnEtransfer = body.nameOnEtransfer?.trim() || null;
    if ("photoVideoConsent" in body) data.photoVideoConsent = Boolean(body.photoVideoConsent);
    if (typeof body.categoryId === "string" && body.categoryId.trim()) data.categoryId = body.categoryId.trim();

    const updated = await prisma.tournamentRegistration.update({ where: { id }, data });
    return NextResponse.json({ id: updated.id });
  } catch (e) {
    console.error("PATCH /api/registrations/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.tournamentRegistration.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/registrations/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
