import { getYear } from "@/lib/utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/categoryStatus/[id] — upsert status for a category + year.
 *  Cascades to registrations only when going Inactive (cancel all non-cancelled).
 *  Active/Pending transitions leave individual registration statuses untouched. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const year: number = typeof body.year === "number" ? body.year : getYear();
    const status: string = body.status ?? "Pending";

    await prisma.categoryYearStatus.upsert({
      where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: id } },
      create: { tournamentYear: year, categoryId: id, status },
      update: { status },
    });

    if (status === "Inactive") {
      await prisma.tournamentRegistration.updateMany({
        where: { tournamentYear: year, categoryId: id, NOT: { status: "Cancelled" } },
        data: { status: "Cancelled" },
      });
      await prisma.team.deleteMany({ where: { tournamentYear: year, categoryId: id } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/categoryStatus/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
