import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/ntrp — ordered list of NTRP level strings for form dropdowns. */
export async function GET() {
  const rows = await prisma.ntrp.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rows.map((r) => r.level));
}
