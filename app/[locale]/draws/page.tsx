import { getAllMatches } from "@/lib/matches";
import { getAllTeams } from "@/lib/teams";
import { getCategories, getAllCategoryYearStatuses } from "@/lib/categories";
import { getRounds } from "@/lib/round";
import { PageContainer } from "@/app/components/PageContainer";
import { DrawsHub } from "@/app/draws/DrawsHub";

export default async function DrawsPage() {
  const [categories, allMatches, allTeams, allRounds, categoryStatuses] = await Promise.all([
    getCategories(),
    getAllMatches(),
    getAllTeams(),
    getRounds(),
    getAllCategoryYearStatuses(),
  ]);

  return (
    <PageContainer>
      <DrawsHub
        categories={categories}
        allMatches={allMatches}
        allTeams={allTeams}
        allRounds={allRounds}
        categoryStatuses={categoryStatuses}
      />
    </PageContainer>
  );
}
