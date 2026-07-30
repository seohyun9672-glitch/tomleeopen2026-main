import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/community-media/[id]/view — public, anonymous, one view per device (enforced client-side). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const post = await prisma.communityMediaPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json({ viewCount: post.viewCount });
  } catch (e) {
    console.error("POST /api/community-media/[id]/view", e);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
