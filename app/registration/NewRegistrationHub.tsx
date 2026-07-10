"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EntityForm, type FormValues, type FieldConfig } from "@/app/components/forms";
import { registrationFields, REGISTRATION_PAYMENT_KEYS, REGISTRATION_OTHER_KEYS } from "@/lib/field-configs";
import { Button } from "@/app/components/ui/Button";
import { Spinner } from "@/app/components/ui/Spinner";
import { Modal } from "@/app/components/ui/Modal";
import { useLocale } from "@/lib/locale-context";
import { scrollToTop } from "@/lib/utils";
import { contactData } from "@/lib/contactData";
import { formatPrice, totalFromCategories } from "@/lib/registration";
import type { CategoryRecord } from "@/lib/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

type CreatedEntry = { id: string; categoryId: string };

// ─── Section layout helpers ───────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-ui)]">
      <div className="rounded-t-xl border-b border-[var(--color-border-ui)] bg-[var(--color-surface-muted)] px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {title}
        </h3>
      </div>
      <div className="flex flex-col gap-4 rounded-b-xl bg-[var(--color-surface-card)] px-5 py-5">
        {children}
      </div>
    </div>
  );
}

function splitSections(fields: FieldConfig[]) {
  const personal: FieldConfig[] = [];
  const tournament: FieldConfig[] = [];
  const payment: FieldConfig[] = [];
  const other: FieldConfig[] = [];
  for (const f of fields) {
    if (REGISTRATION_PAYMENT_KEYS.has(f.key)) payment.push(f);
    else if (REGISTRATION_OTHER_KEYS.has(f.key)) other.push(f);
    else if (f.key === "categories" || f.key.startsWith("partner_")) tournament.push(f);
    else personal.push(f);
  }
  return { personal, tournament, payment, other };
}

type Props = {
  categories: CategoryRecord[];
  year: number;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={9} y={9} width={13} height={13} rx={2} />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ─── NewRegistrationHub ───────────────────────────────────────────────────────

const EMPTY: FormValues = {};

export function NewRegistrationHub({ categories, year }: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const rf = t.registrationForm;
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CreatedEntry[] | null>(null);

  const manageHref = locale === "ko" ? "/ko/registration/manage" : "/registration/manage";

  const doublesCategories = useMemo(
    () => categories.filter((c) => c.isDoubles),
    [categories],
  );

  const currentPlayerId = values.playerId as string | undefined;

  const fields = useMemo(
    () => registrationFields(t, locale, doublesCategories, categories, currentPlayerId ?? null, { isAdmin: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, doublesCategories, categories, currentPlayerId],
  );

  const selectedCategoryIds = Array.isArray(values.categories) ? (values.categories as string[]) : [];
  const selectedDoublesIds = selectedCategoryIds.filter((id) => doublesCategories.some((c) => c.id === id));
  const totalFee = totalFromCategories(selectedCategoryIds.length);

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!String(values.fullNameEn ?? "").trim()) errs.fullNameEn = rf.errors.required;
    if (!String(values.email ?? "").trim()) errs.email = rf.errors.required;
    else if (!validateEmail(String(values.email))) errs.email = rf.errors.invalidEmail;
    if (!String(values.phone ?? "").trim()) errs.phone = rf.errors.required;
    if (selectedCategoryIds.length === 0) errs.categories = rf.errors.selectAtLeastOneCategory;
    for (const id of selectedDoublesIds) {
      if (!String(values[`partner_${id}`] ?? "").trim()) {
        errs[`partner_${id}`] = rf.errors.partnerNameRequired;
      }
    }
    if (!String(values.nameOnEtransfer ?? "").trim()) errs.nameOnEtransfer = rf.errors.required;
    if (values.mediaConsent !== "true") errs.mediaConsent = rf.errors.mediaConsentRequired;
    if (values.etransferSent !== "true") errs.etransferSent = rf.errors.etransferSentRequired;
    return errs;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const partnerNames: Record<string, string> = {};
    const partnerIds: Record<string, number> = {};
    for (const id of selectedDoublesIds) {
      const name = String(values[`partner_${id}`] ?? "").trim();
      if (name) partnerNames[id] = name;
      const pid = values[`partnerId_${id}`];
      if (pid) partnerIds[id] = Number(pid);
    }

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentYear: year,
          fullNameEn: String(values.fullNameEn ?? "").trim(),
          fullNameKo: String(values.fullNameKo ?? "").trim() || null,
          email: String(values.email ?? "").trim().toLowerCase(),
          phone: String(values.phone ?? "").trim() || null,
          ntrp: String(values.ntrp ?? "").trim() || null,
          clubs: Array.isArray(values.clubs) ? values.clubs : [],
          playerId: values.playerId ? Number(values.playerId) : undefined,
          categories: selectedCategoryIds,
          partnerNames,
          partnerIds,
          nameOnEtransfer: String(values.nameOnEtransfer ?? "").trim() || null,
          photoVideoConsent: values.mediaConsent === "true",
          notes: String(values.notes ?? "").trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmResult(data.created ?? []);
        scrollToTop();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors({ submit: (body as { error?: string }).error ?? rf.errors.registrationFailed });
      }
    } catch {
      setErrors({ submit: rf.errors.registrationFailed });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    const email = String(values.email ?? "").trim();
    setValues(EMPTY);
    setErrors({});
    setConfirmResult(null);
    const dest = email
      ? `${manageHref}?email=${encodeURIComponent(email)}`
      : manageHref;
    router.push(dest);
  }

  function copyEmail() {
    navigator.clipboard.writeText(contactData.email.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const { personal, tournament, payment, other } = splitSections(fields);

  const formProps = {
    values,
    onChange: (updates: Partial<FormValues>) => {
      setValues((prev) => ({ ...prev, ...updates }));
      setErrors((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(updates)) delete next[k];
        return next;
      });
    },
    errors,
    idPrefix: "reg",
  } as const;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="mx-auto flex w-full max-w-[var(--form-max-width)] flex-col gap-4">
        <Link href={manageHref} className="self-start text-sm text-[var(--link-default)] underline">
          {rp.returningRegistrantButton}
        </Link>

        {/* Section 1: Personal details */}
        <FormSection title={rf.sections.playerDetails}>
          <EntityForm fields={personal} {...formProps} />
        </FormSection>

        {/* Section 2: Tournament details */}
        <FormSection title={rf.sections.tournamentDetails}>
          <EntityForm fields={tournament} {...formProps} />
        </FormSection>

        {/* Section 3: Payment details */}
        <FormSection title={rf.sections.paymentDetails}>
          {selectedCategoryIds.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {selectedCategoryIds.length} × {formatPrice(50)}
                </span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {rf.summary.total}: {formatPrice(totalFee)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>{rf.summary.etransferTo}</span>
                <span className="font-medium text-[var(--color-text-primary)]">{t.etransfer.email}</span>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex items-center rounded p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
                  aria-label={copied ? rf.summary.emailCopied : rf.summary.copyEmail}
                  title={copied ? rf.summary.emailCopied : rf.summary.copyEmail}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </>
          )}
          <EntityForm fields={payment} {...formProps} />
        </FormSection>

        {/* Section 3: Other details */}
        <FormSection title={rf.sections.additionalDetails}>
          <EntityForm fields={other} {...formProps} />
        </FormSection>

        {errors.submit && (
          <p className="text-sm text-[var(--color-status-error)]">{errors.submit}</p>
        )}

        <div className="flex flex-1">
          <Button type="submit" className="flex-1 gap-2" disabled={submitting}>
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? rf.buttons.submitting : rf.buttons.submit}
          </Button>
        </div>
      </form>

      {/* Confirmation modal */}
      <Modal
        open={confirmResult !== null}
        onClose={resetForm}
        title={rp.confirmationTitle}
        closeLabel={rp.confirmationClose}
        secondaryAction={{ label: rp.confirmationManage, onClick: resetForm }}
        primaryAction={{ label: rp.confirmationButton, onClick: () => { window.open(contactData.kakao.href, "_blank"); resetForm(); } }}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[var(--color-text-secondary)]">{rp.confirmationBody}</p>
          {confirmResult && confirmResult.length > 0 && (
            <ul className="flex flex-col gap-1">
              {confirmResult.map(({ categoryId }) => {
                const cat = categories.find((c) => c.id === categoryId);
                return (
                  <li key={categoryId} className="text-sm font-medium text-[var(--color-text-primary)]">
                    {cat ? (locale === "ko" ? (cat.labelKo ?? cat.label) : cat.label) : categoryId}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
