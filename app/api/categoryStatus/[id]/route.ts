import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CategoryYearStatus } from "@/lib/categories";
import type { RegistrationStatus } from "@/lib/registration";

const CASCADE_STATUS: Partial<Record<CategoryYearStatus, RegistrationStatus>> = {
  Active: "Confirmed",
  Inactive: "Refund Requested",
};

/** PATCH /api/categoryStatus/[id] — upsert status for a category + year.
 *  Cascades to registrations when Active or Inactive (skips already-Refunded). */
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

    const cascadeTo = CASCADE_STATUS[status as CategoryYearStatus];
    if (cascadeTo) {
      await prisma.tournamentRegistration.updateMany({
        where: {
          tournamentYear: year,
          categoryId: id,
          NOT: { status: "Refunded" satisfies RegistrationStatus },
        },
        data: { status: cascadeTo },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/categoryStatus/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
