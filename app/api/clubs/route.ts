import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clubs = await (prisma as unknown as { club: { findMany: (args: object) => Promise<unknown> } }).club.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { id: true, code: true, sortOrder: true },
    });
    return NextResponse.json(clubs);
  } catch (e) {
    console.error("GET /api/clubs", e);
    return NextResponse.json(
      { error: "Failed to fetch clubs" },
      { status: 500 }
    );
  }
}
