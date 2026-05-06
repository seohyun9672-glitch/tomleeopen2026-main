import type { Locale } from "@/lib/content";
import { buildCategoryByIdMap, categoryLabelForId, getCategories } from "@/lib/category/categories";
import { getSponsors } from "@/lib/sponsors";
import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";
import { Table } from "@/app/components/ui/table/Table";
import type { KeyValueRow } from "@/app/components/ui/table/Table";
import { siteContent } from "@/lib/content";
import { contactData } from "@/lib/contactData";

function prizesRowGroupBreak(rowIndex: number, rows: readonly { type: string }[]): boolean {
  if (rowIndex === 0) return false;
  const resolveGroupType = (idx: number): string => {
    for (let j = idx; j >= 0; j--) {
      const label = rows[j]?.type?.trim() ?? "";
      if (label) return label;
    }
    return "";
  };
  const current = resolveGroupType(rowIndex);
  const prev = resolveGroupType(rowIndex - 1);
  return current !== "" && current !== prev;
}

function categoryFamilyLabel(label: string): string {
  const trimmed = label.trim();
  const parts = trimmed.split(/\s[–-]\s/);
  return (parts[0] ?? trimmed).trim();
}

type Props = { params: Promise<{ locale: string }> };

export default async function OverviewPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === "ko" ? "ko" : "en";
  const t = siteContent[locale];
  const { overview, categories: categoriesSection, prizes, importantDatesTitle, importantDatesRows } = t.overviewPage;
  const rd = t.registrationDetail;

  const [categoriesFromDb, sponsors] = await Promise.all([getCategories(), getSponsors()]);
  const categoriesById = buildCategoryByIdMap(categoriesFromDb);

  const hostLookup = overview.hostSponsorLookupName.trim().toLowerCase();
  const hostSponsor = sponsors.find((s) => {
    const n = s.name.trim().toLowerCase();
    return n === hostLookup || n.includes(hostLookup);
  });

  const overviewTableRows: KeyValueRow[] = overview.table.map((row) =>
    row.value.trim().toLowerCase().includes(hostLookup)
      ? { ...row, ...(hostSponsor?.website ? { href: hostSponsor.website } : {}) }
      : row
  );

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

  const registrationTableRows: KeyValueRow[] = [
    { label: rd.registrationPeriodLabel, value: rd.registrationPeriodValue },
    { label: rd.eligibilityLabel, value: rd.eligibilityValue },
    { label: rd.feeLabel, value: rd.feeValue },
    {
      label: rd.paymentDetailsLabel,
      value: (
        <>
          e-Transfer:{" "}
          <a href={`mailto:${contactData.email}`} className="link-default">
            {contactData.email}
          </a>
        </>
      ),
    },
    {
      label: rd.inquiryLabel,
      value: (
        <>
          <a href={contactData.kakao.href} target="_blank" rel="noreferrer" className="link-default">
            {contactData.kakao.label}
          </a>
          {", "}
          <a href={`mailto:${contactData.email}`} className="link-default">
            {t.contactTable.email}
          </a>
        </>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-[var(--layout-gap)]">
        <Section title={overview.title}>
          <Table variant="key-value" rows={overviewTableRows} />
        </Section>

        <Section title={importantDatesTitle}>
          <Table variant="key-value" rows={importantDateRows} />
        </Section>

        <Section title={rd.title}>
          <Table variant="key-value" rows={registrationTableRows} />
        </Section>

        <Section title={categoriesSection.title}>
          <Table
            variant="data"
            columnNoWrap={[false, true]}
            headers={[t.overviewPage.categoriesTableHeaderCategory, t.overviewPage.categoriesTableHeaderNtrp]}
            dataRows={categoriesFromDb.map((c) => [
              categoryLabelForId(categoriesById, c.id, locale),
              c.ntrp ?? "—",
            ])}
            rowGroupBreakBefore={(rowIndex) =>
              rowIndex > 0 &&
              categoryFamilyLabel(
                categoryLabelForId(categoriesById, categoriesFromDb[rowIndex]?.id ?? "", locale)
              ) !==
                categoryFamilyLabel(
                  categoryLabelForId(categoriesById, categoriesFromDb[rowIndex - 1]?.id ?? "", locale)
                )
            }
          />
          <ul className="list-outside list-disc space-y-[var(--element-gap)] pl-6">
            {categoriesSection.footerNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </Section>

        {/* <Section title={prizes.title}>
          <Table
            variant="data"
            headers={prizes.tableHeaders}
            dataRows={prizes.tableRows.map((r) => [r.type, r.bracket, r.first, r.second, r.third, r.fourth])}
            rowGroupBreakBefore={(rowIndex) => prizesRowGroupBreak(rowIndex, prizes.tableRows)}
          />
        </Section> */}
      </div>
    </PageContainer>
  );
}
