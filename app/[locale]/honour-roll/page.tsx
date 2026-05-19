import { getCategories } from "@/lib/categories";
import { getAllMatches } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { HonourRollHub } from "@/app/honour-roll/HonourRollHub";

export default async function HonourRollPage() {
  const [categories, allMatches] = await Promise.all([getCategories(), getAllMatches()]);

  return (
    <PageContainer>
      <HonourRollHub categories={categories} allMatches={allMatches} />
    </PageContainer>
  );
}
