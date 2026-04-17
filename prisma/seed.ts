import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROUNDS = [
  { id: 1, code: "Pre", labelEn: "Preliminaries", labelKo: "예선", sortOrder: 0 },
  { id: 2, code: "R16", labelEn: "Round of 16",   labelKo: "16강", sortOrder: 1 },
  { id: 3, code: "QF",  labelEn: "Quarterfinals",  labelKo: "8강",  sortOrder: 2 },
  { id: 4, code: "SF",  labelEn: "Semifinals",     labelKo: "준결승", sortOrder: 3 },
  { id: 5, code: "F",   labelEn: "Final",          labelKo: "결승",  sortOrder: 4 },
];

async function main() {
  for (const round of ROUNDS) {
    await prisma.round.upsert({
      where: { code: round.code },
      update: { labelEn: round.labelEn, labelKo: round.labelKo, sortOrder: round.sortOrder },
      create: round,
    });
  }
  console.log("Seeded rounds:", ROUNDS.map((r) => r.code).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
