import { PrismaClient } from "@prisma/client";
import { renumberTeamsInCategory } from "../lib/createTeam";

const prisma = new PrismaClient();

async function main() {
  const year = 2026;

  const jooha = await prisma.player.findFirst({
    where: { fullNameEn: { contains: "Jooha", mode: "insensitive" } },
    select: { id: true, fullNameEn: true },
  });
  const jenny = await prisma.player.findFirst({
    where: {
      OR: [
        { fullNameEn: { contains: "Jenny Yim", mode: "insensitive" } },
        { fullNameEn: { contains: "Jenny", mode: "insensitive" } },
      ],
      fullNameEn: { contains: "Yim", mode: "insensitive" },
    },
    select: { id: true, fullNameEn: true },
  });

  if (!jooha || !jenny) {
    console.error("Could not find players:", { jooha, jenny });
    process.exit(1);
  }

  console.log(`Found: ${jooha.fullNameEn} (id=${jooha.id}), ${jenny.fullNameEn} (id=${jenny.id})`);

  const teams = await prisma.team.findMany({
    where: {
      tournamentYear: year,
      OR: [
        { member1PlayerId: jooha.id, member2PlayerId: jenny.id },
        { member1PlayerId: jenny.id, member2PlayerId: jooha.id },
      ],
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${teams.length} team(s):`, teams.map((t) => `${t.id} (${t.categoryId})`));

  if (teams.length <= 1) {
    console.log("No duplicates found.");
    return;
  }

  // Group by category to handle duplicates within the same category
  const byCategory = new Map<string, typeof teams>();
  for (const team of teams) {
    const list = byCategory.get(team.categoryId) ?? [];
    list.push(team);
    byCategory.set(team.categoryId, list);
  }

  for (const [categoryId, catTeams] of byCategory) {
    if (catTeams.length <= 1) continue;

    // Keep the first (lowest id), delete the rest
    const [keep, ...remove] = catTeams;
    console.log(`Category ${categoryId}: keeping ${keep.id}, deleting ${remove.map((t) => t.id).join(", ")}`);

    for (const dup of remove) {
      // Redirect any match references to the kept team
      const redirected1 = await prisma.match.updateMany({
        where: { tournamentYear: year, team1Id: dup.id },
        data: { team1Id: keep.id },
      });
      const redirected2 = await prisma.match.updateMany({
        where: { tournamentYear: year, team2Id: dup.id },
        data: { team2Id: keep.id },
      });
      if (redirected1.count > 0 || redirected2.count > 0) {
        console.log(`  Redirected ${redirected1.count + redirected2.count} match reference(s) from ${dup.id} → ${keep.id}`);
      }

      await prisma.team.delete({
        where: { tournamentYear_id: { tournamentYear: year, id: dup.id } },
      });
      console.log(`  Deleted duplicate team ${dup.id}`);
    }

    await renumberTeamsInCategory(year, categoryId);
    console.log(`  Renumbered teams in ${categoryId}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
