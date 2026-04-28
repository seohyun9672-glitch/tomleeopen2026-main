import type { Locale } from "@/lib/content";
import { getAvailableYears } from "@/lib/matches";
import { siteContent } from "@/lib/content";
import { getCategories, getCategoryYearStatusList } from "@/lib/category/categories";
import { getMatchesByYearBatch } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { DrawsHub } from "@/app/draws/DrawsHub";

type Props = { params: Promise<{ locale: string }> };

export default async function DrawsPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const [categories, yearsData] = await Promise.all([getCategories(), getAvailableYears()]);
  const { allYears, yearsWithMatches } = yearsData;

  const categoryIds = categories.map((c) => c.id);

  const [statusesByYearEntries, matchesByYear] = await Promise.all([
    Promise.all(allYears.map(async (y) => [y, await getCategoryYearStatusList(y)] as const)),
    getMatchesByYearBatch(allYears, categoryIds),
  ]);

  const statusesByYear = Object.fromEntries(statusesByYearEntries);

  return (
    <PageContainer title={content.drawsPage.heroTitle}>
      <DrawsHub
        categories={categories}
        allYears={allYears}
        yearsWithMatches={yearsWithMatches}
        statusesByYear={statusesByYear}
        matchesByYear={matchesByYear}
      />
    </PageContainer>
  );
}
