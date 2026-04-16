import { prisma } from "@/lib/prisma";

/** Fetch supporting businesses formatted for UI usage */
export async function getCommunityPartners() {
  const list = await prisma.communityPartner.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      image: true,
      website: true,
    },
  });

  return list.map((b) => ({
    id: b.id,
    name: b.name,
    image: b.image,
    href: b.website ?? undefined,
  }));
}