"use client";

import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";
import { Table } from "@/app/components/ui/table/Table";

export default function TournamentRulesPage() {
  return (
    <PageContainer>
      {(t) => {
        const {
          sectionTitles,
          matchGuidelines,
          scheduleAndAttendance,
          retirementAndDisqualification,
          matchRules,
          conductAndEtiquette,
        } = t.rulesPage;

        return (
          <div className="flex flex-col gap-[var(--layout-gap)]">
            <Section title={sectionTitles.matchGuidelines}>
              <Table
                variant="key-value"
                rows={[...matchGuidelines.table]}
                alignTop
              />
            </Section>

            <Section title={sectionTitles.scheduleAndAttendance}>
              <Table
                variant="key-value"
                rows={[...scheduleAndAttendance.table]}
                alignTop
              />
            </Section>

            <Section title={sectionTitles.retirementAndDisqualification}>
              <Table
                variant="key-value"
                rows={[...retirementAndDisqualification.table]}
                alignTop
              />
            </Section>

            <Section title={sectionTitles.matchRules}>
              <p className="leading-relaxed text-[var(--color-text-secondary)]">
                {matchRules.intro}
              </p>
              <Table variant="key-value" rows={[...matchRules.table]} alignTop />
            </Section>

            <Section title={sectionTitles.conductAndEtiquette}>
              <Table
                variant="key-value"
                rows={[...conductAndEtiquette.table]}
                alignTop
              />
            </Section>
          </div>
        );
      }}
    </PageContainer>
  );
}
