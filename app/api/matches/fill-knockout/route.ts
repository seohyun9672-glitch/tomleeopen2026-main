import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { autoFillKnockoutSlots } from "@/lib/generateMatches";

/** POST /api/matches/fill-knockout — sync not-yet-played knockout slots from prelim standings. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentYear, categoryId } = body;
    if (!tournamentYear || !categoryId) {
      return NextResponse.json({ error: "tournamentYear and categoryId required" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { prelimFormat: true },
    });
    if (!category?.prelimFormat) {
      return NextResponse.json({ error: "Category has no prelimFormat" }, { status: 400 });
    }

    const result = await autoFillKnockoutSlots(tournamentYear, categoryId, category.prelimFormat);
    if (result.updated.length > 0) revalidateTag("all-matches", "default");
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/matches/fill-knockout", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
