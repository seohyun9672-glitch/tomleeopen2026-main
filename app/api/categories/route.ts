import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { applyPostCloseCategoryRules } from "@/lib/registrationStatus";

export async function GET() {
  try {
    await applyPostCloseCategoryRules(getYear());
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error("GET /api/categories", e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

/** POST /api/categories — create a new category (admin). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim().toUpperCase() : "";
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!id || !label)
      return NextResponse.json({ error: "id and label required" }, { status: 400 });

    await prisma.category.create({
      data: {
        id,
        label,
        labelKo: body.labelKo?.trim() || null,
        category: body.category?.trim() || null,
        categoryKo: body.categoryKo?.trim() || null,
        tier: body.tier?.trim() || null,
        tierKo: body.tierKo?.trim() || null,
        isDoubles: Boolean(body.isDoubles),
        ntrp: body.ntrp?.trim() || null,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      },
    });

    const year: number = typeof body.year === "number" ? body.year : getYear();
    await prisma.categoryYearStatus.upsert({
      where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: id } },
      create: { tournamentYear: year, categoryId: id, status: body.status ?? "Pending" },
      update: { status: body.status ?? "Pending" },
    });

    return NextResponse.json({ id });
  } catch (e) {
    console.error("POST /api/categories", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
