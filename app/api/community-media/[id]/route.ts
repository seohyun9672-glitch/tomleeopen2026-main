import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommunityMediaPostWithComments } from "@/lib/communityMedia";

/** GET /api/community-media/[id] — public, single post with comments. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const post = await getCommunityMediaPostWithComments(id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    console.error("GET /api/community-media/[id]", e);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

/** PATCH /api/community-media/[id] — admin-only, edits title/nickname and/or toggles isAwardWinner. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const data: { isAwardWinner?: boolean; title?: string; nickname?: string } = {};
    if (typeof body.isAwardWinner === "boolean") data.isAwardWinner = body.isAwardWinner;
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.nickname === "string" && body.nickname.trim()) data.nickname = body.nickname.trim();
    const post = await prisma.communityMediaPost.update({ where: { id }, data });
    revalidateTag("community-media", "default");
    return NextResponse.json({ id: post.id, title: post.title, nickname: post.nickname, isAwardWinner: post.isAwardWinner });
  } catch (e) {
    console.error("PATCH /api/community-media/[id]", e);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

/** DELETE /api/community-media/[id] — admin-only, cascades comments. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await prisma.communityMediaPost.delete({ where: { id } });
    revalidateTag("community-media", "default");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/community-media/[id]", e);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
