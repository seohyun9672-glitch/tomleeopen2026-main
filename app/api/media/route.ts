import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/media — admin-only, creates an Article/Video/Photo row. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const type = typeof body.type === "string" ? body.type : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!type || !["articles", "videos", "photos"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const media = await prisma.media.create({
      data: {
        type,
        title,
        titleKo: body.titleKo?.trim() || null,
        subtitle: body.subtitle?.trim() || null,
        subtitleKo: body.subtitleKo?.trim() || null,
        image: body.image?.trim() || null,
        media: body.media?.trim() || null,
        date: body.date ? new Date(body.date) : null,
        outlet: body.outlet?.trim() || null,
        outletKo: body.outletKo?.trim() || null,
        categoryId: body.categoryId?.trim() || null,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        tournamentYear: body.tournamentYear ? Number(body.tournamentYear) : null,
      },
    });

    return NextResponse.json({ id: media.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/media", e);
    return NextResponse.json({ error: "Failed to create media" }, { status: 500 });
  }
}
