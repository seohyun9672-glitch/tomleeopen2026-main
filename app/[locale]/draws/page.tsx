import { getAllMatches } from "@/lib/matches";
import { getAllTeams } from "@/lib/teams";
import { getCategories } from "@/lib/categories";
import { PageContainer } from "@/app/components/PageContainer";
import { DrawsHub } from "@/app/draws/DrawsHub";

export default async function DrawsPage() {
  const [categories, allMatches, allTeams] = await Promise.all([
    getCategories(),
    getAllMatches(),
    getAllTeams(),
  ]);

  return (
    <PageContainer>
      <DrawsHub categories={categories} allMatches={allMatches} allTeams={allTeams} />
    </PageContainer>
  );
}
