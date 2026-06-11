import { prisma } from "@/lib/prisma";

/**
 * Look up a player by name; if none exists, create a stub with no email.
 * The stub gets a real email when that player submits their own registration.
 */
export async function resolveOrCreatePartner(
  partnerName: string | null | undefined,
  excludePlayerId: number
): Promise<number | null> {
  const name = partnerName?.trim();
  if (!name) return null;

  const existing = await prisma.player.findFirst({
    where: {
      id: { not: excludePlayerId },
      OR: [
        { fullNameEn: { equals: name, mode: "insensitive" } },
        { fullNameKo: { equals: name, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const stub = await prisma.player.create({
      data: { fullNameEn: name, email: "" },
    });
    return stub.id;
  } catch (err) {
    console.error("resolveOrCreatePartner: stub creation failed:", err);
    return null;
  }
}
