import type { ReactNode } from "react";
import type { Locale } from "@/lib/content";
import { siteContent } from "@/lib/content";
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

type Props = { params: Promise<{ locale: string }> };

export default async function TournamentRulesPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const content = siteContent[locale];
  const { preliminariesCourt } = content.overviewPage;
  const {
    sectionTitles,
    formatAndScoring,
    rules,
    officialBall,
    preliminaryMatches,
    finalistsSelection,
    resultsSection,
  } = content.rulesPage;

  const scoringRows = [formatAndScoring.table[0], formatAndScoring.table[1], formatAndScoring.table[2]].filter(Boolean);
  const matchGuidelinesRows = [
    { label: officialBall.title, items: officialBall.table[0]?.items ?? [] },
    { label: preliminaryMatches.title, items: preliminaryMatches.table[0]?.items ?? [] },
    { label: finalistsSelection.title, value: buildFinalistsSelectionValue(finalistsSelection.table[0]?.items ?? []) },
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

  const tableWrap = "overflow-hidden rounded-2xl text-[var(--section-text)]";

  return (
    <PageContainer title={content.rulesPage.heroTitle}>
      <div className="space-y-[var(--layout-gap)] md:space-y-[var(--space-16)]">
        <Section title={sectionTitles.matchGuidelines} titleClassName="text-[color:var(--foreground)]" contentWhite>
          <div className={tableWrap}>
            <Table variant="key-value" rows={matchGuidelinesRows} alignTop />
          </div>
        </Section>

        <Section title={sectionTitles.scoringFormat} titleClassName="text-[color:var(--foreground)]" contentWhite>
          <div className={tableWrap}>
            <Table variant="key-value" rows={scoringRows} alignTop />
          </div>
        </Section>

        <Section title={sectionTitles.matchSchedulingCourtAvailability} titleClassName="text-[color:var(--foreground)]" contentWhite>
          <div className="space-y-[var(--section-gap)] md:space-y-[var(--layout-gap)] text-[var(--section-text)]">
            <p className="text-body text-[var(--color-text-secondary)]">{preliminariesCourt.description}</p>
            <Table
              variant="data"
              headers={preliminariesCourt.prelimHeaders}
              dataRows={preliminariesCourt.prelimRows.map((row) => [
                (() => {
                  const locationNote = "locationNote" in row ? row.locationNote : undefined;
                  return (
                    <span key={`${row.location}-cell`}>
                      <a href={row.href} target="_blank" rel="noreferrer" className="link-default">
                        {row.location}
                      </a>
                      {locationNote ? <span className="table-inline-secondary-line">{locationNote}</span> : null}
                    </span>
                  );
                })(),
                row.date,
                row.day,
                row.time,
              ])}
            />
          </div>
        </Section>

        <Section title={resultsSection.title} titleClassName="text-[color:var(--foreground)]" contentWhite>
          <div className={tableWrap}>
            <Table variant="key-value" rows={resultsRows} alignTop />
          </div>
        </Section>

        <Section title={sectionTitles.localRules} titleClassName="text-[color:var(--foreground)]" contentWhite>
          <div className="space-y-[var(--section-gap)] md:space-y-[var(--layout-gap)] text-[var(--section-text)]">
            <p className="leading-relaxed text-[var(--color-text-secondary)]">{rules.intro}</p>
            <div className={tableWrap}>
              <Table variant="key-value" rows={rules.table} alignTop />
            </div>
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
