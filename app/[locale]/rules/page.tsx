"use client";

import type { ReactNode } from "react";
import { contactData } from "@/lib/contactData";
import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";
import { Table } from "@/app/components/ui/table/Table";

function buildFinalistsSelectionValue(items: readonly ReactNode[]): ReactNode {
  const intro = items[0] ?? "";
  const criteriaHeader = items[2] ?? "";
  const criteria = items.slice(3);
  const formatNotice = items[1] ?? "";
  return (
    <ul className="list-outside list-disc w-full">
      <li>{intro}</li>
      <li>
        {criteriaHeader}
        {criteria.length > 0 && (
          <ul className="mt-0.5 list-outside list-disc space-y-0.5 pl-[var(--content-gap)]">
            {criteria.map((criterion, i) => (
              <li key={i}>{criterion}</li>
            ))}
          </ul>
        )}
      </li>
      <li>{formatNotice}</li>
    </ul>
  );
}

export default function TournamentRulesPage() {
  return (
    <PageContainer>
      {(t) => {
        const {
          sectionTitles,
          formatAndScoring,
          rules,
          officialBall,
          preliminaryMatches,
          finalistsSelection,
          resultsSection,
          preliminariesCourt,
        } = t.rulesPage;

        const scoringRows = [
          formatAndScoring.table[0],
          formatAndScoring.table[1],
          formatAndScoring.table[2],
        ].filter(Boolean);

        const matchGuidelinesRows = [
          { label: officialBall.title, items: officialBall.table[0]?.items ?? [] },
          { label: preliminaryMatches.title, items: preliminaryMatches.table[0]?.items ?? [] },
          {
            label: finalistsSelection.title,
            value: buildFinalistsSelectionValue(finalistsSelection.table[0]?.items ?? []),
          },
        ];

        const resultsRows = [
          {
            label: resultsSection.reportingResultsLabel,
            items: [
              <>
                {resultsSection.reportingResultsPrefix}
                <a href={contactData.kakao.href} target="_blank" rel="noreferrer" className="link-default">
                  {resultsSection.reportingResultsLinkLabel}
                </a>
                {resultsSection.reportingResultsSuffix}
              </>,
              resultsSection.reportingResultsExample,
            ],
          },
          {
            label: resultsSection.viewingResultsLabel,
            items: [
              <>
                {resultsSection.viewingResultsPrefix}
                <a href={contactData.kakao.href} target="_blank" rel="noreferrer" className="link-default">
                  {resultsSection.viewingResultsLinkLabel}
                </a>
                {resultsSection.viewingResultsSuffix}
              </>,
            ],
          },
        ];

        return (
          <div className="flex flex-col gap-[var(--layout-gap)]">
            <Section title={sectionTitles.matchGuidelines}>
              <Table variant="key-value" rows={matchGuidelinesRows} alignTop />
            </Section>

            <Section title={sectionTitles.scoringFormat}>
              <Table variant="key-value" rows={scoringRows} alignTop />
            </Section>

            <Section title={sectionTitles.matchSchedulingCourtAvailability}>
              <p className="text-body text-[var(--color-text-secondary)]">{preliminariesCourt.description}</p>
              <Table
                variant="data"
                headers={preliminariesCourt.prelimHeaders}
                dataRows={preliminariesCourt.prelimRows.map((row) => [
                  <span key={`${row.location}-cell`}>
                    <a href={row.href} target="_blank" rel="noreferrer" className="link-default">
                      {row.location}
                    </a>
                  </span>,
                  row.date,
                  row.day,
                  row.time,
                ])}
              />
            </Section>

            <Section title={resultsSection.title}>
              <Table variant="key-value" rows={resultsRows} alignTop />
            </Section>

            <Section title={sectionTitles.localRules}>
              <p className="leading-relaxed text-[var(--color-text-secondary)]">{rules.intro}</p>
              <Table variant="key-value" rows={rules.table} alignTop />
            </Section>
          </div>
        );
      }}
    </PageContainer>
  );
}
