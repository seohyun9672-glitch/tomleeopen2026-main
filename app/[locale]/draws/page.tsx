import { getAllMatches } from "@/lib/matches";
import { getCategories } from "@/lib/categories";
import { PageContainer } from "@/app/components/PageContainer";
import { DrawsHub } from "@/app/draws/DrawsHub";

export default async function DrawsPage() {
  const [categories, allMatches] = await Promise.all([getCategories(), getAllMatches()]);

  return (
    <PageContainer>
      <DrawsHub categories={categories} allMatches={allMatches} />
    </PageContainer>
  );
}
