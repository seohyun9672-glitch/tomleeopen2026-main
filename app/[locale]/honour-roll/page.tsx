import type { Locale } from "@/lib/content";
import { PageContainer } from "@/app/components/PageContainer";
import { getCategories, getCategoryYearStatusList } from "@/lib/cateogry/categories";
import { getHonourRollByCategoryIds } from "@/lib/matches";
import { prisma } from "@/lib/prisma";
import { siteContent } from "@/lib/content";
import { HonourRollHub } from "@/app/honour-roll/HonourRollHub";

type Props = { params: Promise<{ locale: string }> };

export default async function HonourRollPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const [categories, yearRows] = await Promise.all([
    getCategories(),
    prisma.match.findMany({
      select: { tournamentYear: true },
      distinct: ["tournamentYear"],
      orderBy: { tournamentYear: "desc" },
    }),
  ]);

  const categoryIds = categories.map((c) => c.id);
  const allYears = [...new Set(yearRows.map((r) => r.tournamentYear))].sort((a, b) => b - a);

  const [honourRollByCategory, statusesByYear] = await Promise.all([
    getHonourRollByCategoryIds(categoryIds),
    Promise.all(
      allYears.map(async (y) => [y, await getCategoryYearStatusList(y)] as const)
    ).then((entries) => Object.fromEntries(entries)),
  ]);

  return (
    <PageContainer title={content.heroTitle}>
      <HonourRollHub
        categories={categories}
        allYears={allYears}
        honourRollByCategory={honourRollByCategory}
        statusesByYear={statusesByYear}
      />
    </PageContainer>
  );
}
