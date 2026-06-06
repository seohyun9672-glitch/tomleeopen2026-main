import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/prizes/[id] — update prize amounts for an existing bracket. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, number> = {};
    for (const key of ["first", "second", "third", "fourth"] as const) {
      if (typeof body[key] === "number") data[key] = Math.max(0, Math.round(body[key]));
    }
    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });

    const updated = await prisma.categoryPrize.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/prizes/[id]", e);
    return NextResponse.json({ error: "Failed to update prize" }, { status: 500 });
  }
}
