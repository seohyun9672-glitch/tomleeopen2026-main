import { NextResponse } from "next/server";
import { getClubs } from "@/lib/clubs";

export async function GET() {
  try {
    const clubs = await getClubs();
    return NextResponse.json(clubs);
  } catch (e) {
    console.error("GET /api/clubs", e);
    return NextResponse.json(
      { error: "Failed to fetch clubs" },
      { status: 500 }
    );
  }
}
