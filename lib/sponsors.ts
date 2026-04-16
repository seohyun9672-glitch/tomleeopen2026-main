import { prisma } from "@/lib/prisma";

/** Fetch all sponsors ordered by sortOrder then name */
export async function getSponsors() {
  const rows = await prisma.sponsor.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, website: true, image: true, sortOrder: true },
  });
  return rows.map((s) => ({
    ...s,
    image: s.image ?? null,
  }));
}
