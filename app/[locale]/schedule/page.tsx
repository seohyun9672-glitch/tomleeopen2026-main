import { getAllMatches } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { ScheduleHub } from "@/app/schedule/ScheduleHub";

export default async function SchedulePage() {
  const allMatches = await getAllMatches();

  return (
    <PageContainer>
      <ScheduleHub allMatches={allMatches} />
    </PageContainer>
  );
}
