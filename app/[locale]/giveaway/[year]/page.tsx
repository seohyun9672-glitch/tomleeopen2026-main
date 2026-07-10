import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GiveawayHub } from "@/app/giveaway/GiveawayHub";
import { TUMBLERS } from "@/lib/tumblers";

export default async function GiveawayPage({
  params,
}: {
  params: Promise<{ locale: string; year: string }>;
}) {
  const { year } = await params;
  const tournamentYear = Number(year);
  if (tournamentYear !== 2026) notFound();

  // Upsert options so imageSrc/colour/ml/stock stay in sync with TUMBLERS
  await Promise.all(
    TUMBLERS.map((t, i) =>
      prisma.tumblerOption.upsert({
        where: { tournamentYear_optionId: { tournamentYear, optionId: t.id } },
        create: {
          tournamentYear,
          optionId: t.id,
          label: t.label,
          imageSrc: t.imageSrc ?? null,
          colour: t.colour,
          colourKo: t.colourKo,
          ml: t.ml,
          stock: t.stock,
          status: "Available",
          sortOrder: i,
        },
        update: {
          label: t.label,
          imageSrc: t.imageSrc ?? null,
          colour: t.colour,
          colourKo: t.colourKo,
          ml: t.ml,
          stock: t.stock,
          sortOrder: i,
        },
      }),
    ),
  );

  const options = await prisma.tumblerOption.findMany({
    where: { tournamentYear },
    orderBy: { sortOrder: "asc" },
    select: { optionId: true, label: true, imageSrc: true, status: true, ml: true, colour: true, colourKo: true },
  });

  return <GiveawayHub year={tournamentYear} initialOptions={options} />;
}
