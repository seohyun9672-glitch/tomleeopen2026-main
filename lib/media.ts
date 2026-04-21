import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type MediaType = "articles" | "videos" | "photos";

export type MediaRecord = {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  date: Date | null;
  image: string | null;
  imagePlaceholder: string | null;
  imagePlaceholderKo: string | null;
  media: string | null;
  outlet: string | null;
  sortOrder: number;
  categoryId: string | null;
  tournamentYear: number | null;
};

export const getMedia = cache(async function getMedia(type?: MediaType): Promise<MediaRecord[]> {
  try {
    const where = type ? { type } : {};
    try {
      return await prisma.media.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
        select: {
          id: true, type: true, title: true, subtitle: true, date: true, image: true,
          imagePlaceholder: true, imagePlaceholderKo: true, media: true, outlet: true,
          sortOrder: true, categoryId: true, tournamentYear: true,
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
        ).map((r) => ({ ...r, imagePlaceholder: null, imagePlaceholderKo: null }));
      } catch {
        const rows = await prisma.media.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
          select: {
            id: true, type: true, title: true, subtitle: true, date: true, media: true,
            outlet: true, sortOrder: true, categoryId: true, tournamentYear: true,
          },
        });
        return rows.map((r) => ({ ...r, image: null, imagePlaceholder: null, imagePlaceholderKo: null }));
      }
    }
  } catch (e) {
    console.error("getMedia:", e);
    return [];
  }
});

export type PhotoGalleryGroup = {
  categoryId: string;
  categoryLabel: string;
  items: MediaRecord[];
};

function primaryPhotoOnly(items: MediaRecord[]): MediaRecord[] {
  if (items.length <= 1) return items;
  const [best] = [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
  return best ? [best] : [];
}

export const getPhotoGalleriesByYear = cache(async function getPhotoGalleriesByYear(
  tournamentYear: number,
  categoryLabels: { id: string; label: string }[]
): Promise<PhotoGalleryGroup[]> {
  try {
    const photos = await (async () => {
      try {
        return await prisma.media.findMany({
          where: { type: "photos", tournamentYear, categoryId: { not: null } },
          orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
          select: {
            id: true, type: true, title: true, subtitle: true, date: true, image: true,
            imagePlaceholder: true, imagePlaceholderKo: true, media: true, outlet: true,
            sortOrder: true, categoryId: true, tournamentYear: true,
          },
        });
      } catch {
        try {
          return (
            await prisma.media.findMany({
              where: { type: "photos", tournamentYear, categoryId: { not: null } },
              orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
              select: {
                id: true, type: true, title: true, subtitle: true, date: true, image: true,
                media: true, outlet: true, sortOrder: true, categoryId: true, tournamentYear: true,
              },
            })
          ).map((r) => ({ ...r, imagePlaceholder: null, imagePlaceholderKo: null }));
        } catch {
          const rows = await prisma.media.findMany({
            where: { type: "photos", tournamentYear, categoryId: { not: null } },
            orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
            select: {
              id: true, type: true, title: true, subtitle: true, date: true, media: true,
              outlet: true, sortOrder: true, categoryId: true, tournamentYear: true,
            },
          });
          return rows.map((r) => ({ ...r, image: null, imagePlaceholder: null, imagePlaceholderKo: null }));
        }
      }
    })();
    const byCategory = new Map<string, MediaRecord[]>();
    for (const p of photos) {
      const cid = p.categoryId ?? "";
      if (!byCategory.has(cid)) byCategory.set(cid, []);
      byCategory.get(cid)!.push(p as MediaRecord);
    }
    const labelMap = new Map(categoryLabels.map((c) => [c.id, c.label]));
    return Array.from(byCategory.entries())
      .map(([categoryId, items]) => ({
        categoryId,
        categoryLabel: labelMap.get(categoryId) ?? categoryId,
        items: primaryPhotoOnly(items),
      }))
      .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));
  } catch (e) {
    console.error("getPhotoGalleriesByYear:", e);
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
