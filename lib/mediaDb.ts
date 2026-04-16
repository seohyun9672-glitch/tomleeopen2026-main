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
  /** Custom copy when `image`/`media` cover is missing; overrides default “No image”. */
  imagePlaceholder: string | null;
  imagePlaceholderKo: string | null;
  media: string | null;
  outlet: string | null;
  sortOrder: number;
  categoryId: string | null;
  tournamentYear: number | null;
};

/** Media items, optionally filtered by type. Returns [] if the Media table is missing or query fails. */
export const getMedia = cache(async function getMedia(type?: MediaType): Promise<MediaRecord[]> {
  try {
    const where = type ? { type } : {};
    try {
      return await prisma.media.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
        select: {
          id: true,
          type: true,
          title: true,
          subtitle: true,
          date: true,
          image: true,
          imagePlaceholder: true,
          imagePlaceholderKo: true,
          media: true,
          outlet: true,
          sortOrder: true,
          categoryId: true,
          tournamentYear: true,
        },
      });
    } catch {
      try {
        // `imagePlaceholder*` missing but `image` exists — keep article/video/photo covers.
        return (
          await prisma.media.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
            select: {
              id: true,
              type: true,
              title: true,
              subtitle: true,
              date: true,
              image: true,
              media: true,
              outlet: true,
              sortOrder: true,
              categoryId: true,
              tournamentYear: true,
            },
          })
        ).map((r) => ({ ...r, imagePlaceholder: null, imagePlaceholderKo: null }));
      } catch {
        const rows = await prisma.media.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            title: true,
            subtitle: true,
            date: true,
            media: true,
            outlet: true,
            sortOrder: true,
            categoryId: true,
            tournamentYear: true,
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

/** One card per category: lowest `sortOrder`, then `id` (handles duplicate Media rows). */
function primaryPhotoOnly(items: MediaRecord[]): MediaRecord[] {
  if (items.length <= 1) return items;
  const [best] = [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
  return best ? [best] : [];
}

/** Photos for a given tournament year, grouped by category (for gallery per category). */
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
            id: true,
            type: true,
            title: true,
            subtitle: true,
            date: true,
            image: true,
            imagePlaceholder: true,
            imagePlaceholderKo: true,
            media: true,
            outlet: true,
            sortOrder: true,
            categoryId: true,
            tournamentYear: true,
          },
        });
      } catch {
        try {
          return (
            await prisma.media.findMany({
              where: { type: "photos", tournamentYear, categoryId: { not: null } },
              orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
              select: {
                id: true,
                type: true,
                title: true,
                subtitle: true,
                date: true,
                image: true,
                media: true,
                outlet: true,
                sortOrder: true,
                categoryId: true,
                tournamentYear: true,
              },
            })
          ).map((r) => ({ ...r, imagePlaceholder: null, imagePlaceholderKo: null }));
        } catch {
          const rows = await prisma.media.findMany({
            where: { type: "photos", tournamentYear, categoryId: { not: null } },
            orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { date: "desc" }, { id: "asc" }],
            select: {
              id: true,
              type: true,
              title: true,
              subtitle: true,
              date: true,
              media: true,
              outlet: true,
              sortOrder: true,
              categoryId: true,
              tournamentYear: true,
            },
          });
          return rows.map((r) => ({
            ...r,
            image: null,
            imagePlaceholder: null,
            imagePlaceholderKo: null,
          }));
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
