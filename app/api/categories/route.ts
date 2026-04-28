import { NextResponse } from "next/server";
import { getCategories } from "@/lib/category/categories";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error("GET /api/categories", e);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
