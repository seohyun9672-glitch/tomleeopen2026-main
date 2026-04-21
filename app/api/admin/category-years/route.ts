import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCategoryYearStatusDelegate,
  getCategoryYearStatusList,
  parseCategoryYearStatus,
} from "@/lib/cateogry/categories";

export const dynamic = "force-dynamic";

/** GET ?year=2026 — list category statuses for a tournament year. */
export async function GET(request: Request) {
  const year = new URL(request.url).searchParams.get("year");
  const tournamentYear = year ? parseInt(year, 10) : NaN;
  if (!Number.isFinite(tournamentYear)) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  try {
    const items = await getCategoryYearStatusList(tournamentYear);
    return NextResponse.json({ tournamentYear, items });
  } catch (e) {
    console.error("GET /api/admin/category-years", e);
    return NextResponse.json({ error: "Failed to load category years" }, { status: 500 });
  }
}

type PatchBody = {
  tournamentYear?: number;
  categoryId?: string;
  status?: string;
};

/** PATCH — upsert per-year category status (admin). */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchBody;
    const tournamentYear = body.tournamentYear;
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const status = parseCategoryYearStatus(body.status);
    if (!Number.isFinite(tournamentYear) || tournamentYear! < 2000) {
      return NextResponse.json({ error: "tournamentYear is required" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ error: "status must be Pending, Active, or Inactive" }, { status: 400 });
    }
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Unknown category" }, { status: 404 });
    }
    const cy = getCategoryYearStatusDelegate();
    await cy.upsert({
      where: {
        tournamentYear_categoryId: {
          tournamentYear: tournamentYear!,
          categoryId,
        },
      },
      create: { tournamentYear: tournamentYear!, categoryId, status },
      update: { status },
    });

    // Cascade registration status changes when category becomes Active or Inactive.
    if (status === "Inactive") {
      // Cancel all pending/confirmed registrations for this category.
      await prisma.tournamentRegistration.updateMany({
        where: {
          tournamentYear: tournamentYear!,
          categoryId,
          status: { in: ["Pending", "Confirmed"] },
        },
        data: { status: "Cancelled" },
      });
    } else if (status === "Active") {
      // Confirm pending registrations and re-confirm those cancelled by a previous Inactive transition.
      // Does not touch Refund Requested or Refunded records.
      await prisma.tournamentRegistration.updateMany({
        where: {
          tournamentYear: tournamentYear!,
          categoryId,
          status: { in: ["Pending", "Cancelled"] },
        },
        data: { status: "Confirmed" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/category-years", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
