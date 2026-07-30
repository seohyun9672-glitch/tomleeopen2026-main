import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/community-media/[id]/like — public, anonymous, unlimited. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const post = await prisma.communityMediaPost.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });
    return NextResponse.json({ likeCount: post.likeCount });
  } catch (e) {
    console.error("POST /api/community-media/[id]/like", e);
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
}

/** DELETE /api/community-media/[id]/like — public, anonymous, undo a like. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const current = await prisma.communityMediaPost.findUnique({ where: { id }, select: { likeCount: true } });
    const post = await prisma.communityMediaPost.update({
      where: { id },
      data: { likeCount: Math.max(0, (current?.likeCount ?? 1) - 1) },
    });
    return NextResponse.json({ likeCount: post.likeCount });
  } catch (e) {
    console.error("DELETE /api/community-media/[id]/like", e);
    return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 });
  }
}
