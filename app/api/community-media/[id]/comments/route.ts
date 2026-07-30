import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

/** POST /api/community-media/[id]/comments — public, creates a comment. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    const commentBody = typeof body.body === "string" ? body.body.trim() : "";

    if (!nickname || !commentBody) {
      return NextResponse.json({ error: "Nickname and comment are required" }, { status: 400 });
    }

    const comment = await prisma.communityMediaComment.create({
      data: {
        communityMediaPostId: id,
        nickname,
        body: commentBody,
      },
    });

    revalidateTag("community-media", "default");
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error("POST /api/community-media/[id]/comments", e);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
