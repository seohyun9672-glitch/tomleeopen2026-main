"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { PageContainer } from "@/app/components/PageContainer";
import type { CategoryRecord } from "@/lib/categories";
import type { RegStatus } from "@/app/[locale]/registration/page";
import { RegistrationForm } from "./RegistrationForm";

type Props = {
  categories: CategoryRecord[];
  regStatus: RegStatus;
};

export function RegistrationHub({ categories, regStatus }: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;

  const year = new Date().getFullYear();
  const manageHref = locale === "ko" ? "/ko/registration/manage" : "/registration/manage";

  const statusMessage =
    regStatus === "not-open"
      ? { title: rp.notYetOpenTitle, body: rp.notYetOpenMessage }
      : regStatus === "closed"
        ? { title: rp.closedTitle, body: rp.closedMessage }
        : null;

  return (
    <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
      <div className="flex w-full flex-col gap-3">
        {statusMessage ? (
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-ui)] bg-[var(--color-surface-card)] px-5 py-5">
            <p className="font-semibold text-[var(--color-text-primary)]">{statusMessage.title}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{statusMessage.body}</p>
          </div>
        ) : (
          <>
            <Link
              href={manageHref}
              className="self-start text-sm text-[var(--link-default)] underline"
            >
              {rp.returningRegistrantButton}
            </Link>
            <RegistrationForm
              categories={categories}
              year={year}
              onSuccess={() => {}}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
