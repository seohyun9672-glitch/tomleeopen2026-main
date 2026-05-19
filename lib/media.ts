import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type MediaRecord = {
  id: string;
  type: string;
  title: string;
  titleKo: string | null;
  subtitle: string | null;
  subtitleKo: string | null;
  date: Date | null;
  image: string | null;
  imagePlaceholder: string | null;
  imagePlaceholderKo: string | null;
  media: string | null;
  outlet: string | null;
  outletKo: string | null;
  sortOrder: number;
  categoryId: string | null;
  tournamentYear: number | null;
};

export const getMedia = cache(async function getMedia(
  type?: "articles" | "videos" | "photos",
): Promise<MediaRecord[]> {
  try {
    const where = type ? { type } : {};
    try {
      return await prisma.media.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
        select: {
          id: true, type: true, title: true, titleKo: true, subtitle: true, subtitleKo: true,
          date: true, image: true, imagePlaceholder: true, imagePlaceholderKo: true,
          media: true, outlet: true, outletKo: true, sortOrder: true, categoryId: true,
          tournamentYear: true,
        },
      });
    } catch {
      try {
        return (
          await prisma.media.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
            select: {
              id: true, type: true, title: true, subtitle: true, date: true, image: true,
              media: true, outlet: true, sortOrder: true, categoryId: true, tournamentYear: true,
            },
          })
        ).map((r) => ({
          ...r,
          titleKo: null, subtitleKo: null, outletKo: null,
          imagePlaceholder: null, imagePlaceholderKo: null,
        }));
      } catch {
        const rows = await prisma.media.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
          select: {
            id: true, type: true, title: true, subtitle: true, date: true, media: true,
            outlet: true, sortOrder: true, categoryId: true, tournamentYear: true,
          },
        });
        return rows.map((r) => ({
          ...r,
          image: null, titleKo: null, subtitleKo: null, outletKo: null,
          imagePlaceholder: null, imagePlaceholderKo: null,
        }));
      }
    }
  } catch (e) {
    console.error("getMedia:", e);
    return [];
  }
});

// ─── YouTube helpers ──────────────────────────────────────────────────────────

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;
      const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (embed?.[1]) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeThumbnailHqUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
