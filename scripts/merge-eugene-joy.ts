/**
 * Merges duplicate Eugene Joy player records.
 * Keeps the profile with the real email, reassigns all DB references from
 * the duplicate, then deletes it.
 */
import { PrismaClient } from "@prisma/client";
import { renumberTeamsInCategory } from "../lib/createTeam";

const prisma = new PrismaClient();

async function main() {
  const eugenes = await prisma.player.findMany({
    where: { fullNameEn: { contains: "Eugene Joy", mode: "insensitive" } },
    orderBy: { id: "asc" },
  });

  console.log("Found Eugene Joy records:");
  for (const p of eugenes) {
    console.log(`  id=${p.id}  email=${p.email}  fullNameEn=${p.fullNameEn}`);
  }

  if (eugenes.length < 2) {
    console.log("Nothing to merge.");
    return;
  }

  // Keep the record with a real (non-empty, non-placeholder) email.
  const canonical =
    eugenes.find((p) => p.email && p.email !== "" && !p.email.includes("@email.com") && !p.email.includes("@placeholder")) ??
    eugenes[0];
  const duplicates = eugenes.filter((p) => p.id !== canonical.id);

  console.log(`\nKeeping: id=${canonical.id} (${canonical.email})`);
  console.log(`Merging into it: ${duplicates.map((p) => `id=${p.id} (${p.email})`).join(", ")}`);

  for (const dup of duplicates) {
    console.log(`\n--- Merging id=${dup.id} → id=${canonical.id} ---`);

    // TournamentRegistration (as player)
    const regs = await prisma.tournamentRegistration.findMany({
      where: { playerId: dup.id },
      select: { id: true, tournamentYear: true, categoryId: true },
    });
    for (const reg of regs) {
      // Check if canonical already has a registration for this year+category
      const conflict = await prisma.tournamentRegistration.findFirst({
        where: { playerId: canonical.id, tournamentYear: reg.tournamentYear, categoryId: reg.categoryId },
      });
      if (conflict) {
        console.log(`  Deleting duplicate registration ${reg.id} (canonical already has ${reg.tournamentYear} ${reg.categoryId})`);
        await prisma.tournamentRegistration.delete({ where: { id: reg.id } });
      } else {
        console.log(`  Reassigning registration ${reg.id} (${reg.tournamentYear} ${reg.categoryId}) to canonical`);
        await prisma.tournamentRegistration.update({ where: { id: reg.id }, data: { playerId: canonical.id } });
      }
    }

    // TournamentRegistration (as partner)
    const partnerRegs = await prisma.tournamentRegistration.updateMany({
      where: { partnerId: dup.id },
      data: { partnerId: canonical.id },
    });
    if (partnerRegs.count > 0) console.log(`  Reassigned ${partnerRegs.count} registration(s) where dup was partner`);

    // Team (as member1)
    const teamsAsMember1 = await prisma.team.findMany({
      where: { member1PlayerId: dup.id },
      select: { id: true, tournamentYear: true, categoryId: true },
    });
    for (const team of teamsAsMember1) {
      console.log(`  Reassigning team ${team.id} member1 → canonical`);
      await prisma.team.update({
        where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: team.id } },
        data: { member1PlayerId: canonical.id },
      });
    }

    // Team (as member2)
    const teamsAsMember2 = await prisma.team.findMany({
      where: { member2PlayerId: dup.id },
      select: { id: true, tournamentYear: true, categoryId: true },
    });
    for (const team of teamsAsMember2) {
      console.log(`  Reassigning team ${team.id} member2 → canonical`);
      await prisma.team.update({
        where: { tournamentYear_id: { tournamentYear: team.tournamentYear, id: team.id } },
        data: { member2PlayerId: canonical.id },
      });
    }

    // PlayerClub — delete dup's clubs (canonical's clubs take precedence; avoid unique constraint violations)
    await prisma.playerClub.deleteMany({ where: { playerId: dup.id } });
    console.log(`  Deleted dup's club entries`);

    // Delete the duplicate player
    await prisma.player.delete({ where: { id: dup.id } });
    console.log(`  Deleted duplicate player id=${dup.id}`);
  }

  // After merging, check for and delete any duplicate teams for canonical in the same category
  const allTeams = await prisma.team.findMany({
    where: {
      OR: [
        { member1PlayerId: canonical.id },
        { member2PlayerId: canonical.id },
      ],
    },
    orderBy: { id: "asc" },
  });

  const byCategory = new Map<string, typeof allTeams>();
  for (const t of allTeams) {
    const key = `${t.tournamentYear}:${t.categoryId}`;
    byCategory.set(key, [...(byCategory.get(key) ?? []), t]);
  }

  for (const [key, teams] of byCategory) {
    if (teams.length <= 1) continue;
    const [keep, ...remove] = teams;
    console.log(`\nDuplicate teams in ${key}: keeping ${keep.id}, removing ${remove.map((t) => t.id).join(", ")}`);
    for (const dup of remove) {
      await prisma.match.updateMany({ where: { tournamentYear: keep.tournamentYear, team1Id: dup.id }, data: { team1Id: keep.id } });
      await prisma.match.updateMany({ where: { tournamentYear: keep.tournamentYear, team2Id: dup.id }, data: { team2Id: keep.id } });
      await prisma.team.delete({ where: { tournamentYear_id: { tournamentYear: dup.tournamentYear, id: dup.id } } });
      console.log(`  Deleted duplicate team ${dup.id}`);
    }
    await renumberTeamsInCategory(keep.tournamentYear, keep.categoryId);
    console.log(`  Renumbered ${key}`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
