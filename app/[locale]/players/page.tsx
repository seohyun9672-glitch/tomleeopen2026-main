import type { Locale } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { siteContent } from "@/lib/content";
import { PlayersTable } from "@/app/tables/PlayersTable";
import { PageContainer } from "@/app/components/PageContainer";

type Props = { params: Promise<{ locale: string }> };

export default async function PlayersPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const playersFromDb = await prisma.player.findMany({
    select: {
      id: true,
      fullNameEn: true,
      fullNameKo: true,
      clubs: { select: { clubCode: true } },
    },
    orderBy: { fullNameEn: "asc" },
  });

  const players = playersFromDb
    .map((p) => ({
      id: p.id,
      fullNameEn: p.fullNameEn,
      fullNameKo: p.fullNameKo,
      clubs: p.clubs.map((c) => c.clubCode).sort(),
    }))
    .sort((a, b) => {
      const en = a.fullNameEn.localeCompare(b.fullNameEn, "en");
      if (en !== 0) return en;
      return (a.fullNameKo ?? "").localeCompare(b.fullNameKo ?? "", "en");
    });

  return (
    <PageContainer title={content.playersPage.heroTitle}>
      <PlayersTable
        rows={players}
        mode="public"
        emptyNoRowsText={content.playersPage.emptyStateNoPlayers}
        emptyNoMatchText={content.playersPage.emptyStateNoMatch}
      />
    </PageContainer>
  );
}
