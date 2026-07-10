import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateMatches } from "@/lib/generateMatches";

/** PATCH /api/categories/[id] — update category fields (admin). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const VALID_FORMATS = ["GROUP_ROUND_ROBIN", "ROUND_ROBIN", "ELIMINATION"];
    const prelimFormat =
      typeof body.prelimFormat === "string" && VALID_FORMATS.includes(body.prelimFormat)
        ? body.prelimFormat
        : body.prelimFormat === null
        ? null
        : undefined;

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
        ...(prelimFormat !== undefined ? { prelimFormat } : {}),
      },
    });

    // Trigger match generation for each year this category is active in
    if (prelimFormat !== undefined && prelimFormat !== null) {
      const activeYears = await prisma.categoryYearStatus.findMany({
        where: { categoryId: id, status: "Active" },
        select: { tournamentYear: true },
      });
      await Promise.all(activeYears.map((r) => generateMatches(r.tournamentYear, id)));
      revalidateTag("all-matches", "default");
    }

    return NextResponse.json({ id });
  } catch (e) {
    console.error("PATCH /api/categories/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
