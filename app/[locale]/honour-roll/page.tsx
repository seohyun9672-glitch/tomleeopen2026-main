import type { Locale } from "@/lib/content";
import { PageContainer } from "@/app/components/PageContainer";
import { getCategories } from "@/lib/category/categories";
import { getAvailableYears, getMatchesByYearBatch } from "@/lib/matches";
import { siteContent } from "@/lib/content";
import { HonourRollHub } from "@/app/honour-roll/HonourRollHub";

type Props = { params: Promise<{ locale: string }> };

export default async function HonourRollPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];

  const [categories, yearsData] = await Promise.all([getCategories(), getAvailableYears()]);
  const { allYears } = yearsData;

  const categoryIds = categories.map((c) => c.id);
  const matchesByYear = await getMatchesByYearBatch(allYears, categoryIds);

  return (
    <PageContainer title={content.heroTitle}>
      <HonourRollHub
        categories={categories}
        allYears={allYears}
        matchesByYear={matchesByYear}
      />
    </PageContainer>
  );
}
