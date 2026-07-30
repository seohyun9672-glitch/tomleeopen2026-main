import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const communityMediaPostSelect = {
  id: true,
  title: true,
  nickname: true,
  imageUrl: true,
  createdAt: true,
  viewCount: true,
  likeCount: true,
  isAwardWinner: true,
  tournamentYear: true,
  comments: { orderBy: { createdAt: "asc" as const } },
  _count: { select: { comments: true } },
};

export type CommunityMediaCommentRecord = {
  id: string;
  nickname: string;
  body: string;
  createdAt: Date;
};

export type CommunityMediaPostRecord = {
  id: string;
  title: string;
  nickname: string;
  imageUrl: string;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
  isAwardWinner: boolean;
  tournamentYear: number;
  commentCount: number;
  comments: CommunityMediaCommentRecord[];
};

export type CommunityMediaPostWithComments = CommunityMediaPostRecord;

/** Public feed of community media posts (with comments preloaded), most recent upload first. */
export const getCommunityMediaPosts = unstable_cache(
  async function getCommunityMediaPosts(year?: number): Promise<CommunityMediaPostRecord[]> {
    try {
      const rows = await prisma.communityMediaPost.findMany({
        where: year ? { tournamentYear: year } : {},
        orderBy: [{ createdAt: "desc" }],
        select: communityMediaPostSelect,
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        nickname: r.nickname,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
        viewCount: r.viewCount,
        likeCount: r.likeCount,
        isAwardWinner: r.isAwardWinner,
        tournamentYear: r.tournamentYear,
        commentCount: r._count.comments,
        comments: r.comments.map((c) => ({
          id: c.id,
          nickname: c.nickname,
          body: c.body,
          createdAt: c.createdAt,
        })),
      }));
    } catch (e) {
      console.error("getCommunityMediaPosts:", e);
      return [];
    }
  },
  ["community-media-posts"],
  { tags: ["community-media"], revalidate: 30 },
);

/** Single post with its comments — used by admin/API lookups. */
export const getCommunityMediaPostWithComments = cache(async function getCommunityMediaPostWithComments(
  id: string,
): Promise<CommunityMediaPostWithComments | null> {
  try {
    const row = await prisma.communityMediaPost.findUnique({
      where: { id },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        _count: { select: { comments: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      nickname: row.nickname,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
      viewCount: row.viewCount,
      likeCount: row.likeCount,
      isAwardWinner: row.isAwardWinner,
      tournamentYear: row.tournamentYear,
      commentCount: row._count.comments,
      comments: row.comments.map((c) => ({
        id: c.id,
        nickname: c.nickname,
        body: c.body,
        createdAt: c.createdAt,
      })),
    };
  } catch (e) {
    console.error("getCommunityMediaPostWithComments:", e);
    return null;
  }
});
