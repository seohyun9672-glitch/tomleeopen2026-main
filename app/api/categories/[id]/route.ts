import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/categories/[id] — update category fields (admin). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await prisma.category.update({
      where: { id },
      data: {
        label: typeof body.label === "string" ? body.label.trim() : undefined,
        labelKo: typeof body.labelKo === "string" ? body.labelKo.trim() || null : undefined,
        category: typeof body.category === "string" ? body.category.trim() || null : undefined,
        categoryKo: typeof body.categoryKo === "string" ? body.categoryKo.trim() || null : undefined,
        tier: typeof body.tier === "string" ? body.tier.trim() || null : undefined,
        tierKo: typeof body.tierKo === "string" ? body.tierKo.trim() || null : undefined,
        ntrp: typeof body.ntrp === "string" ? body.ntrp.trim() || null : undefined,
        isDoubles: typeof body.isDoubles === "boolean" ? body.isDoubles : undefined,
      },
    });

    return NextResponse.json({ id });
  } catch (e) {
    console.error("PATCH /api/categories/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
