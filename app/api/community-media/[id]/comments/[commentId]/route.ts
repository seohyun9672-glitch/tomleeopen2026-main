import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/community-media/[id]/comments/[commentId] — admin-only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { commentId } = await params;
    await prisma.communityMediaComment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/community-media/[id]/comments/[commentId]", e);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
