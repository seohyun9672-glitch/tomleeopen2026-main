"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/locale-context";
import { importantDates } from "@/lib/importantDatesData";
import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";
import { Table } from "@/app/components/ui/table/Table";
import type { KeyValueRow } from "@/app/components/ui/table/Table";

type CategoryRow = {
  id: string;
  label: string;
  labelKo: string | null;
  category: string | null;
  categoryKo: string | null;
  tier: string | null;
  tierKo: string | null;
  ntrp: string | null;
};

type SentencePart = { text: string } | { linkLabel: string; href: string };

function renderSentenceParts(parts: readonly SentencePart[]) {
  return (
    <>
      {parts.map((part, i) =>
        "href" in part ? (
          <a key={i} href={part.href} target="_blank" rel="noreferrer" className="link-default">
            {part.linkLabel}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

type OverviewHubProps = {
  categories: CategoryRow[];
  hostSponsorWebsite?: string;
};

type CategoryGroup = { category: string; categoryKo: string | null; items: CategoryRow[] };

function groupCategories(categories: CategoryRow[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const cat of categories) {
    const key = cat.category ?? cat.label;
    const last = groups[groups.length - 1];
    if (last && last.category === key) {
      last.items.push(cat);
    } else {
      groups.push({ category: key, categoryKo: cat.categoryKo, items: [cat] });
    }
  }
  return groups;
}

const tableSurface = "w-full min-w-0 overflow-hidden rounded-[var(--table-radius)] border border-[var(--table-border-row)]";
const tableXScroll = "table-x-scroll min-w-0 w-full max-w-full";
const headerCell = "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-left font-medium text-[var(--table-header-text)] bg-[var(--table-header-bg)]";
const cell = "py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-[var(--table-body-text)] bg-[var(--table-row-bg)]";
const rowBorder = "border-b border-[var(--table-border-row)]";
const groupStartBorderTop = "border-t-2 border-t-[var(--table-border-row)]";

type CategoriesTableProps = {
  categories: CategoryRow[];
  locale: string;
  t: { categoriesTableHeaderCategory: string; categoriesTableHeaderTier: string; categoriesTableHeaderNtrp: string };
};

function CategoriesTable({ categories, locale, t }: CategoriesTableProps) {
  const groups = groupCategories(categories);
  const isKo = locale === "ko";
  return (
    <div className={tableSurface}>
      <div className={tableXScroll}>
        <table className="table-data border-collapse text-left w-full">
          <thead>
            <tr className={rowBorder}>
              <th className={`${headerCell} sticky top-0 z-20`}>{t.categoriesTableHeaderCategory}</th>
              <th className={`${headerCell} sticky top-0 z-20 border-l border-l-[var(--table-border-row)]`}>{t.categoriesTableHeaderTier}</th>
              <th className={`${headerCell} sticky top-0 z-20 whitespace-nowrap border-l border-l-[var(--table-border-row)]`}>{t.categoriesTableHeaderNtrp}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) =>
              group.items.map((item, ii) => (
                <tr
                  key={item.id}
                  className={`${rowBorder} ${gi > 0 && ii === 0 ? "is-table-row-group-start" : ""}`}
                >
                  {ii === 0 && (
                    <td
                      rowSpan={group.items.length}
                      className={`${cell} align-top font-medium ${gi > 0 ? groupStartBorderTop : ""}`}
                    >
                      {isKo ? (group.categoryKo ?? group.category) : group.category}
                    </td>
                  )}
                  <td className={`${cell} border-l border-l-[var(--table-border-row)] ${gi > 0 && ii === 0 ? groupStartBorderTop : ""}`}>
                    {isKo ? (item.tierKo ?? item.tier ?? "—") : (item.tier ?? "—")}
                  </td>
                  <td className={`${cell} whitespace-nowrap border-l border-l-[var(--table-border-row)] ${gi > 0 && ii === 0 ? groupStartBorderTop : ""}`}>
                    {item.ntrp ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OverviewHub({ categories, hostSponsorWebsite }: OverviewHubProps) {
  const { t, locale } = useLocale();
  const {
    overview,
    categories: categoriesSection,
    importantDatesTitle,
    matchLogistics,
    venueAndCourts,
    resultReporting,
  } = t.overviewPage;
  const hostLookup = overview.hostSponsorLookupName.trim().toLowerCase();

  const overviewTableRows: KeyValueRow[] = overview.table.map((row) =>
    row.value.trim().toLowerCase().includes(hostLookup)
      ? { ...row, ...(hostSponsorWebsite ? { href: hostSponsorWebsite } : {}) }
      : row
  );

  const importantDatesRows = importantDates
    .filter((entry) => entry.label !== "Tournament")
    .map((entry) => ({
      label: locale === "ko" ? (entry.labelKo ?? entry.label) : entry.label,
      value:
        locale === "ko"
          ? entry.type === "text" ? (entry.valueKo ?? entry.value) : (entry.valueDisplayKo ?? entry.valueDisplay)
          : entry.type === "text" ? entry.value : entry.valueDisplay,
    }));

  const importantDateRows: KeyValueRow[] = importantDatesRows.map((row) => {
    const match = row.value.match(/^(.*?)(\s*\([^)]*\))$/);
    if (!match) return row;
    return {
      ...row,
      value: (
        <>
          {match[1].trim()}{" "}
          <span className="italic text-[var(--color-text-secondary)]">{match[2]}</span>
        </>
      ),
    };
  });

  return (
    <PageContainer>
      <div className="flex flex-col gap-[var(--layout-gap)]">
        <Section title={overview.title}>
          <Table variant="key-value" rows={overviewTableRows} />
        </Section>

        <Section title={importantDatesTitle}>
          <Table variant="key-value" rows={importantDateRows} />
        </Section>

        <Section title={categoriesSection.title}>
          <CategoriesTable categories={categories} locale={locale} t={t.overviewPage} />
          <ul className="list-outside list-disc space-y-[var(--element-gap)] pl-6">
            {categoriesSection.footerNotes.map((note: ReactNode, i: number) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </Section>

        <Section title={matchLogistics.title} id={matchLogistics.id}>
          <Table
            variant="key-value"
            rows={[
              { label: matchLogistics.officialBall.title, items: [...matchLogistics.officialBall.items] },
              { label: matchLogistics.preliminaryMatches.title, items: [...matchLogistics.preliminaryMatches.items] },
              {
                label: matchLogistics.finalistsSelection.title,
                value: (
                  <ul className="list-outside list-disc space-y-1 w-full">
                    {matchLogistics.finalistsSelection.format.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                    <li>
                      {matchLogistics.finalistsSelection.tiebreakers.intro}
                      <ul className="mt-0.5 list-outside list-disc space-y-0.5 pl-[var(--content-gap)]">
                        {matchLogistics.finalistsSelection.tiebreakers.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                ),
              },
            ]}
            alignTop
          />
        </Section>

        <Section title={venueAndCourts.title} id={venueAndCourts.id}>
          <p className="text-body text-[var(--color-text-secondary)]">{venueAndCourts.description}</p>
          <Table
            variant="data"
            headers={[...venueAndCourts.prelimHeaders]}
            dataRows={venueAndCourts.prelimRows.map((row) => [
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

        <Section title={resultReporting.title} id={resultReporting.id}>
          <Table
            variant="key-value"
            rows={[
              {
                label: resultReporting.reportingResults.label,
                items: [
                  renderSentenceParts(resultReporting.reportingResults.sentenceParts),
                  resultReporting.reportingResults.example,
                ],
              },
              {
                label: resultReporting.viewingResults.label,
                items: [renderSentenceParts(resultReporting.viewingResults.sentenceParts)],
              },
            ]}
            alignTop
          />
        </Section>
      </div>
    </PageContainer>
  );
}
