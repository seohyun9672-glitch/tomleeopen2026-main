"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/locale-context";
import { contactData } from "@/lib/contactData";
import { PageContainer } from "@/app/components/PageContainer";
import { Section } from "@/app/components/Section";
import { Table } from "@/app/components/ui/table/Table";
import type { KeyValueRow } from "@/app/components/ui/table/Table";
import { Button } from "@/app/components/ui/Button";
import { eligibilityContent } from "@/lib/content/registrationPage";
import type { EligibilityGroup } from "@/lib/content/registrationPage";

function renderEligibilityGroupValue(group: EligibilityGroup, depth = 0, index?: number): ReactNode {
  const isSingleItemNoSubs =
    (group.items?.length ?? 0) === 1 && !group.subItems?.length;

  return (
    <div className="flex flex-col gap-1.5">
      {depth > 0 && (
        <p
          className={[
            "text-sm text-[var(--color-text-primary)]",
            depth === 1 ? "font-semibold" : "font-medium",
          ].join(" ")}
        >
          {index !== undefined && depth >= 2 ? `${index}. ` : ""}{group.label}
        </p>
      )}
      {group.content && (
        <p className="text-sm text-[var(--color-text-secondary)]">{group.content}</p>
      )}
      {group.items && group.items.length > 0 && (
        isSingleItemNoSubs ? (
          <p className="text-sm text-[var(--color-text-secondary)]">{group.items[0]}</p>
        ) : (
          <ul className="list-outside list-disc space-y-0.5 pl-4 text-sm text-[var(--color-text-secondary)]">
            {group.items.map((item, i) => {
              const isLast = i === group.items!.length - 1;
              return (
                <li key={i}>
                  {item}
                  {isLast && group.subItems && group.subItems.length > 0 && (
                    <ul className="mt-0.5 list-outside list-disc space-y-0.5 pl-[var(--content-gap)]">
                      {group.subItems.map((sub, j) => (
                        <li key={j}>{sub}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
      {group.groups && group.groups.length > 0 && (
        <div className={`flex flex-col ${depth === 0 ? "gap-3" : "gap-2"}`}>
          {group.groups.map((sub, i) => (
            <div key={i}>{renderEligibilityGroupValue(sub, depth + 1, i + 1)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegistrationHub() {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const rd = t.registrationDetail;

  const newRegHref = locale === "ko" ? "/ko/registration/new" : "/registration/new";

  const registrationTableRows: KeyValueRow[] = [
    { label: rd.registrationPeriodLabel, value: rd.registrationPeriodValue },
    { label: rd.feeLabel, value: rd.feeValue },
    { label: rp.giveawayLabel, value: rp.giveawayValue },
    {
      label: rd.paymentDetailsLabel,
      value: (
        <>
          e-Transfer:{" "}
          <a href={`mailto:${contactData.email.link}`} className="link-default underline">
            {contactData.email.link}
          </a>
        </>
      ),
    },
    {
      label: rd.inquiryLabel,
      value: (
        <>
          <a href={contactData.kakao.href} target="_blank" rel="noreferrer" className="link-default underline">
            {contactData.kakao.label}
          </a>
          {", "}
          <a href={`mailto:${contactData.email.link}`} className="link-default underline">
            {contactData.email.label}
          </a>
        </>
      ),
    },
  ];

  const eligibility = locale === "ko" ? eligibilityContent.ko : eligibilityContent.en;

  const eligibilityTableRows: KeyValueRow[] = eligibility.groups.map((group) => ({
    label: group.label,
    value: renderEligibilityGroupValue(group),
  }));

  return (
    <PageContainer>
      <div className="flex w-full flex-col gap-[var(--section-gap)]">
        <Section title={rp.step1Title}>
          <Table variant="key-value" rows={registrationTableRows} />
        </Section>

        <Section title={rp.step2Title}>
          <p className="text-sm text-[var(--color-text-secondary)]">{eligibility.content}</p>
          <Table variant="key-value" rows={eligibilityTableRows} alignTop />
        </Section>

        <Button variant="primary" size="large" href={newRegHref}>
          {rp.newRegistrationButton}
        </Button>
      </div>
    </PageContainer>
  );
}
