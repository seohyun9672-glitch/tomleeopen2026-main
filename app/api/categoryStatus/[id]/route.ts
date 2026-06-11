import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMatches } from "@/lib/generateMatches";

/** PATCH /api/categoryStatus/[id] — upsert status for a category + year.
 *  Cascades to registrations:
 *  - Inactive → Cancelled for all non-cancelled regs
 *  - Active/Pending → re-derive from paymentReceived (Confirmed or Pending) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const year: number = typeof body.year === "number" ? body.year : new Date().getFullYear();
    const status: string = body.status ?? "Pending";

    await prisma.categoryYearStatus.upsert({
      where: { tournamentYear_categoryId: { tournamentYear: year, categoryId: id } },
      create: { tournamentYear: year, categoryId: id, status },
      update: { status },
    });

    if (status === "Inactive") {
      // Cancel all non-cancelled registrations
      await prisma.tournamentRegistration.updateMany({
        where: { tournamentYear: year, categoryId: id, NOT: { status: "Cancelled" } },
        data: { status: "Cancelled" },
      });
    } else {
      // Re-derive status from paymentReceived for non-cancelled regs
      await prisma.tournamentRegistration.updateMany({
        where: { tournamentYear: year, categoryId: id, NOT: { status: "Cancelled" }, paymentReceived: true },
        data: { status: "Confirmed" },
      });
      await prisma.tournamentRegistration.updateMany({
        where: { tournamentYear: year, categoryId: id, NOT: { status: "Cancelled" }, paymentReceived: false },
        data: { status: "Pending" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/categoryStatus/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
