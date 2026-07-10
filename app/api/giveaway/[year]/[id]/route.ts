import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ year: string; id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (typeof body.received === "boolean") data.received = body.received;
    if (typeof body.received2 === "boolean") data.received2 = body.received2;
    if (typeof body.optionId === "string") data.optionId = body.optionId;
    if ("optionId2" in body) data.optionId2 = body.optionId2 ?? null;
    if ("pickupClub" in body) data.pickupClub = body.pickupClub ?? null;
    if ("pickupNote" in body) data.pickupNote = body.pickupNote ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.giveaway.update({
      where: { id },
      data,
    });

    return NextResponse.json({ id: updated.id, received: updated.received });
  } catch (e) {
    console.error("PATCH /api/giveaway/[year]/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
