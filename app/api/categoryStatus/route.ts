import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/categoryStatus?year= — list all CategoryYearStatus rows for a year. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const rows = await prisma.categoryYearStatus.findMany({
      where: year ? { tournamentYear: parseInt(year, 10) } : undefined,
      select: { tournamentYear: true, categoryId: true, status: true },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/categoryStatus", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
