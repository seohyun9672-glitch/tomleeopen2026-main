import { prisma } from "@/lib/prisma";
import { PlayersHub } from "@/app/players/PlayersHub";
import { PageContainer } from "@/app/components/PageContainer";

export default async function PlayersPage() {
  const rows = await prisma.player.findMany({
    select: {
      id: true,
      fullNameEn: true,
      fullNameKo: true,
      clubs: { select: { clubCode: true, club: { select: { name: true, nameKo: true } } } },
    },
    orderBy: { fullNameEn: "asc" },
  });

  const players = rows
    .map((p) => ({
      id: p.id,
      fullNameEn: p.fullNameEn,
      fullNameKo: p.fullNameKo,
      clubs: p.clubs
        .map((c) => ({
          code: c.clubCode,
          name: c.club.name?.trim() || c.clubCode,
          nameKo: c.club.nameKo?.trim() || null,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => {
      const en = a.fullNameEn.localeCompare(b.fullNameEn, "en");
      if (en !== 0) return en;
      return (a.fullNameKo ?? "").localeCompare(b.fullNameKo ?? "", "en");
    });

  return (
    <PageContainer>
      <PlayersHub rows={players} />
    </PageContainer>
  );
}
