import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
type ResolvedRow = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  playerId: number;
  partnerId: number;
  createdAt: Date;
};

// Load local env files for direct script execution.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const regs = await prisma.tournamentRegistration.findMany({
    where: {
      OR: [
        { categoryId: { startsWith: "MD-" } },
        { categoryId: { startsWith: "WD-" } },
        { categoryId: { startsWith: "XD-" } },
        { categoryId: { startsWith: "SD60-" } },
      ],
    },
    select: {
      id: true,
      tournamentYear: true,
      categoryId: true,
      playerId: true,
      partnerId: true,
      createdAt: true,
    },
  });

  const resolvedRows: ResolvedRow[] = [];

  for (const reg of regs) {
    const resolvedPartnerId = reg.partnerId;
    if (!resolvedPartnerId || resolvedPartnerId === reg.playerId) continue;

    resolvedRows.push({
      id: reg.id,
      tournamentYear: reg.tournamentYear,
      categoryId: reg.categoryId,
      playerId: reg.playerId,
      partnerId: resolvedPartnerId,
      createdAt: reg.createdAt,
    });
  }

  const groups = new Map<string, ResolvedRow[]>();
  for (const row of resolvedRows) {
    const a = Math.min(row.playerId, row.partnerId);
    const b = Math.max(row.playerId, row.partnerId);
    const key = `${row.tournamentYear}:${row.categoryId}:${a}:${b}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let merges = 0;
  let deletes = 0;
  let canonicalUpdates = 0;

  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    const [, , aRaw, bRaw] = key.split(":");
    const primaryId = Number(aRaw);
    const secondaryId = Number(bRaw);

    const keep =
      list.find((r) => r.playerId === primaryId) ??
      [...list].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id))[0];

    if (keep.playerId !== primaryId || keep.partnerId !== secondaryId) {
      await prisma.tournamentRegistration.update({
        where: { id: keep.id },
        data: {
          playerId: primaryId,
          partnerId: secondaryId,
        },
      });
      canonicalUpdates += 1;
    }

    const toDelete = list.filter((r) => r.id !== keep.id).map((r) => r.id);
    if (toDelete.length > 0) {
      await prisma.tournamentRegistration.deleteMany({
        where: { id: { in: toDelete } },
      });
      deletes += toDelete.length;
      merges += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        scannedDoublesRows: regs.length,
        groups: groups.size,
        mergedGroups: merges,
        deletedRows: deletes,
        canonicalUpdates,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("merge-doubles-registrations failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
