import { PrismaClient } from "@prisma/client";
import { renumberTeamsInCategory } from "../lib/createTeam";

const prisma = new PrismaClient();

async function main() {
  const year = 2026;
  const categoryId = "MD-G";

  // Find all players matching Will Kim and Eugene Joy (may be multiple records due to stub creation)
  const wills = await prisma.player.findMany({
    where: { fullNameEn: { contains: "Will Kim", mode: "insensitive" } },
    select: { id: true, fullNameEn: true, email: true },
  });
  const eugenes = await prisma.player.findMany({
    where: { fullNameEn: { contains: "Eugene Joy", mode: "insensitive" } },
    select: { id: true, fullNameEn: true, email: true },
  });

  console.log("Will Kim players found:", wills);
  console.log("Eugene Joy players found:", eugenes);

  const willIds = wills.map((p) => p.id);
  const eugeneIds = eugenes.map((p) => p.id);

  if (willIds.length === 0 || eugeneIds.length === 0) {
    console.error("Could not find both players.");
    process.exit(1);
  }

  // Find all teams in MD-G 2026 that involve any Will or Eugene player record
  const teams = await prisma.team.findMany({
    where: {
      tournamentYear: year,
      categoryId,
      OR: [
        ...willIds.map((id) => ({ member1PlayerId: id })),
        ...willIds.map((id) => ({ member2PlayerId: id })),
        ...eugeneIds.map((id) => ({ member1PlayerId: id })),
        ...eugeneIds.map((id) => ({ member2PlayerId: id })),
      ],
    },
    include: {
      member1: { select: { id: true, fullNameEn: true, email: true } },
      member2: { select: { id: true, fullNameEn: true, email: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log(`\nFound ${teams.length} team(s) in ${year} ${categoryId}:`);
  for (const t of teams) {
    console.log(`  ${t.id}: ${t.member1?.fullNameEn} (id=${t.member1PlayerId}) + ${t.member2?.fullNameEn} (id=${t.member2PlayerId})`);
  }

  if (teams.length <= 1) {
    console.log("No duplicates found.");
    return;
  }

  // Determine canonical player IDs: prefer the record with a real email
  const canonicalWill = wills.find((p) => p.email && !p.email.includes("@email.com")) ?? wills[0];
  const canonicalEugene = eugenes.find((p) => p.email && !p.email.includes("@email.com") && p.email !== "") ?? eugenes[0];

  console.log(`\nCanonical Will: id=${canonicalWill.id} (${canonicalWill.email})`);
  console.log(`Canonical Eugene: id=${canonicalEugene.id} (${canonicalEugene.email})`);

  // Keep the team that uses canonical IDs (or the first team if none do)
  const keepTeam =
    teams.find(
      (t) =>
        (t.member1PlayerId === canonicalWill.id || t.member2PlayerId === canonicalWill.id) &&
        (t.member1PlayerId === canonicalEugene.id || t.member2PlayerId === canonicalEugene.id)
    ) ?? teams[0];

  const removeTeams = teams.filter((t) => t.id !== keepTeam.id);

  console.log(`\nKeeping team: ${keepTeam.id}`);
  console.log(`Deleting: ${removeTeams.map((t) => t.id).join(", ")}`);

  for (const dup of removeTeams) {
    const r1 = await prisma.match.updateMany({
      where: { tournamentYear: year, team1Id: dup.id },
      data: { team1Id: keepTeam.id },
    });
    const r2 = await prisma.match.updateMany({
      where: { tournamentYear: year, team2Id: dup.id },
      data: { team2Id: keepTeam.id },
    });
    if (r1.count + r2.count > 0) {
      console.log(`  Redirected ${r1.count + r2.count} match reference(s) from ${dup.id} → ${keepTeam.id}`);
    }
    await prisma.team.delete({
      where: { tournamentYear_id: { tournamentYear: year, id: dup.id } },
    });
    console.log(`  Deleted duplicate team ${dup.id}`);
  }

  // If there are stub player records for Eugene/Will, merge registrations onto the canonical ID
  const stubEugenes = eugenes.filter((p) => p.id !== canonicalEugene.id);
  for (const stub of stubEugenes) {
    console.log(`\nMerging stub Eugene (id=${stub.id}) → canonical Eugene (id=${canonicalEugene.id})`);
    await prisma.tournamentRegistration.updateMany({
      where: { playerId: stub.id },
      data: { playerId: canonicalEugene.id },
    });
    await prisma.tournamentRegistration.updateMany({
      where: { partnerId: stub.id },
      data: { partnerId: canonicalEugene.id },
    });
    // Update the kept team if it still references the stub
    await prisma.team.updateMany({
      where: { tournamentYear: year, member1PlayerId: stub.id },
      data: { member1PlayerId: canonicalEugene.id },
    });
    await prisma.team.updateMany({
      where: { tournamentYear: year, member2PlayerId: stub.id },
      data: { member2PlayerId: canonicalEugene.id },
    });
    // Only delete stub if it has no real email (safe to remove)
    if (!stub.email || stub.email === "" || stub.email.includes("@email.com")) {
      await prisma.player.delete({ where: { id: stub.id } }).catch((e) => {
        console.warn(`  Could not delete stub ${stub.id} (may still have references):`, e.message);
      });
      console.log(`  Deleted stub player id=${stub.id}`);
    }
  }

  await renumberTeamsInCategory(year, categoryId);
  console.log(`\nRenumbered teams in ${year} ${categoryId}`);
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
