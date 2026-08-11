import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCommunityMediaPosts } from "@/lib/communityMedia";
import { uploadToR2 } from "@/lib/r2";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** GET /api/community-media — public feed, optional ?year= filter. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;
    const posts = await getCommunityMediaPosts(Number.isFinite(year) ? year : undefined);
    return NextResponse.json(posts);
  } catch (e) {
    console.error("GET /api/community-media", e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

/** POST /api/community-media — anonymous photo upload, goes live immediately. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo");
    const nickname = String(formData.get("nickname") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Photo is required" }, { status: 400 });
    }
    if (!nickname) {
      return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: "File must be a JPG, PNG, or WEBP image" }, { status: 400 });
    }
    if (photo.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const extension = photo.type.split("/")[1] ?? "jpg";
    const imageUrl = await uploadToR2(`community-media/${crypto.randomUUID()}.${extension}`, photo);

    const post = await prisma.communityMediaPost.create({
      data: {
        title,
        nickname,
        imageUrl,
        ipAddress,
      },
    });

    revalidateTag("community-media", "default");
    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/community-media", e);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
