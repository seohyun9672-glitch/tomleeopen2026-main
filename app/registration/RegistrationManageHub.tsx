"use client";

import { useEffect, useMemo, useState } from "react";
import { getYear, scrollToTop } from "@/lib/utils";
import { PageContainer } from "@/app/components/PageContainer";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { Spinner, SpinnerPage } from "@/app/components/ui/Spinner";
import { EntityForm, type FormValues } from "@/app/components/forms";
import { registrationFields } from "@/lib/field-configs";
import { useLocale } from "@/lib/locale-context";
import type { CategoryRecord } from "@/lib/categories";
import type { ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegistrationEntry = {
  id: string;
  categoryId: string;
  status: string;
  photoVideoConsent: boolean;
  nameOnEtransfer: string | null;
  notes: string | null;
};

type LookupResult = {
  playerId: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
  year: number;
  registrations: RegistrationEntry[];
  partnerNames: Record<string, string>;
};

type View = "lookup" | "result" | "edit";

type Props = { categories: CategoryRecord[]; initialEmail?: string };

// ─── ManageSection ────────────────────────────────────────────────────────────

function ManageSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-ui)]">
      <div className="rounded-t-xl border-b border-[var(--color-border-ui)] bg-[var(--color-surface-muted)] px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {title}
        </h3>
      </div>
      <div className="rounded-b-xl bg-[var(--color-surface-card)] px-5 py-4">
        {children}
      </div>
    </div>
  );
}

// ─── EditView ─────────────────────────────────────────────────────────────────

function EditView({
  categories,
  year,
  lookupResult,
  onSuccess,
  onCancel,
}: {
  categories: CategoryRecord[];
  year: number;
  lookupResult: LookupResult;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const rf = t.registrationForm;

  const doublesCategories = useMemo(() => categories.filter((c) => c.isDoubles), [categories]);
  const activeRegs = lookupResult.registrations.filter((r) => r.status !== "Cancelled");
  const originalCategoryIds = activeRegs.map((r) => r.categoryId);

  const initialValues = useMemo((): FormValues => {
    const vals: FormValues = {
      fullNameEn: lookupResult.fullNameEn,
      fullNameKo: lookupResult.fullNameKo ?? "",
      email: lookupResult.email,
      phone: lookupResult.phone ?? "",
      ntrp: lookupResult.ntrp ?? "",
      clubs: lookupResult.clubs,
      playerId: String(lookupResult.playerId),
      categories: originalCategoryIds,
      nameOnEtransfer: activeRegs[0]?.nameOnEtransfer ?? "",
      mediaConsent: activeRegs[0]?.photoVideoConsent ? "true" : "false",
      etransferSent: "true",
      notes: activeRegs[0]?.notes ?? "",
    };
    for (const catId of originalCategoryIds) {
      const name = lookupResult.partnerNames[catId];
      if (name) vals[`partner_${catId}`] = name;
    }
    return vals;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const currentPlayerId = values.playerId as string | undefined;
  const fields = useMemo(
    () => registrationFields(t, locale, doublesCategories, categories, currentPlayerId ?? null, { isAdmin: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, doublesCategories, categories, currentPlayerId],
  );

  const selectedCategoryIds = Array.isArray(values.categories) ? (values.categories as string[]) : [];
  const selectedDoublesIds = selectedCategoryIds.filter((id) => doublesCategories.some((c) => c.id === id));
  const priceChanged = selectedCategoryIds.length !== originalCategoryIds.length;

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!String(values.fullNameEn ?? "").trim()) errs.fullNameEn = rf.errors.required;
    if (!String(values.email ?? "").trim()) errs.email = rf.errors.required;
    if (!String(values.phone ?? "").trim()) errs.phone = rf.errors.required;
    if (selectedCategoryIds.length === 0) errs.categories = rf.errors.selectAtLeastOneCategory;
    for (const id of selectedDoublesIds) {
      if (!String(values[`partner_${id}`] ?? "").trim()) {
        errs[`partner_${id}`] = rf.errors.partnerNameRequired;
      }
    }
    if (!String(values.nameOnEtransfer ?? "").trim()) {
      errs.nameOnEtransfer = rf.errors.required;
    }
    if (values.mediaConsent !== "true") errs.mediaConsent = rf.errors.mediaConsentRequired;
    return errs;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const partnerNames: Record<string, string> = {};
    const partnerIds: Record<string, number> = {};
    for (const id of selectedDoublesIds) {
      const name = String(values[`partner_${id}`] ?? "").trim();
      if (name) partnerNames[id] = name;
      const pid = values[`partnerId_${id}`];
      if (pid) partnerIds[id] = Number(pid);
    }

    try {
      const res = await fetch("/api/registrations/self", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lookupResult.email,
          year,
          fullNameEn: String(values.fullNameEn ?? "").trim(),
          fullNameKo: String(values.fullNameKo ?? "").trim() || null,
          phone: String(values.phone ?? "").trim() || null,
          ntrp: String(values.ntrp ?? "").trim() || null,
          clubs: Array.isArray(values.clubs) ? values.clubs : [],
          categories: selectedCategoryIds,
          partnerNames,
          partnerIds,
          nameOnEtransfer: String(values.nameOnEtransfer ?? "").trim() || null,
          photoVideoConsent: values.mediaConsent === "true",
          notes: String(values.notes ?? "").trim() || null,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors({ submit: (body as { error?: string }).error ?? rf.errors.registrationFailed });
      }
    } catch {
      setErrors({ submit: rf.errors.registrationFailed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer title={rp.manageHeroTitle} contentMaxWidth="max-w-[var(--form-max-width)]">
      <form onSubmit={handleSave} noValidate className="flex w-full flex-col gap-4">
        <EntityForm
          fields={fields}
          values={values}
          onChange={(updates) => {
            setValues((prev) => ({ ...prev, ...updates }));
            setErrors((prev) => {
              const next = { ...prev };
              for (const k of Object.keys(updates)) delete next[k];
              return next;
            });
          }}
          errors={errors}
          idPrefix="edit-reg"
        />
        {errors.submit && (
          <p className="text-sm text-[var(--color-status-error)]">{errors.submit}</p>
        )}
        <div>
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            {rp.cancelEditButton}
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? rp.savingButton : rp.saveButton}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}

// ─── RegistrationManageHub ────────────────────────────────────────────────────

export function RegistrationManageHub({ categories, initialEmail = "" }: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const year = getYear();

  const [view, setView] = useState<View>("lookup");
  const [lookupEmail, setLookupEmail] = useState(initialEmail);
  // Start loading immediately if we have an initialEmail so the lookup form is never shown
  const [lookupLoading, setLookupLoading] = useState(Boolean(initialEmail));
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // ─── Lookup ───────────────────────────────────────────────────────────────

  async function doLookup(email: string) {
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/registrations/lookup?email=${encodeURIComponent(email)}&year=${year}`);
      if (res.status === 404) { setLookupError(rp.lookupNoResult); return; }
      if (!res.ok) { setLookupError(rp.lookupError); return; }
      const data: LookupResult = await res.json();
      setLookupResult(data);
      setView("result");
      scrollToTop();
    } catch {
      setLookupError(rp.lookupError);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleLookup() {
    const email = lookupEmail.trim().toLowerCase();
    if (!email) return;
    await doLookup(email);
  }

  useEffect(() => {
    const email = initialEmail.trim().toLowerCase();
    if (email) doLookup(email);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshLookup() {
    if (!lookupResult) return;
    try {
      const res = await fetch(`/api/registrations/lookup?email=${encodeURIComponent(lookupResult.email)}&year=${year}`);
      if (res.ok) {
        const data: LookupResult = await res.json();
        setLookupResult(data);
      }
    } catch {}
  }

  // ─── Edit view ────────────────────────────────────────────────────────────

  if (view === "edit" && lookupResult) {
    return (
      <EditView
        key={lookupResult.email}
        categories={categories}
        year={year}
        lookupResult={lookupResult}
        onSuccess={async () => {
          await refreshLookup();
          setView("result");
          scrollToTop();
        }}
        onCancel={() => { setView("result"); scrollToTop(); }}
      />
    );
  }

  // ─── Result view ──────────────────────────────────────────────────────────

  if (view === "result" && lookupResult) {
    const { fullNameEn, fullNameKo, email, phone, ntrp, registrations } = lookupResult;
    const activeRegs = registrations.filter(
      (r) => r.status !== "Cancelled"
    );

    return (
      <PageContainer
        title={rp.manageHeroTitle}
        contentMaxWidth="max-w-[var(--form-max-width)]"
        titleActions={
          <Button variant="secondary" onClick={() => { setView("edit"); scrollToTop(); }}>
            {rp.editButton}
          </Button>
        }
      >
        <div className="flex w-full flex-col gap-4">

          {/* Player details */}
          <ManageSection title={t.registrationForm.sections.playerDetails}>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {fullNameEn}{fullNameKo ? ` · ${fullNameKo}` : ""}
              </p>
              <p className="text-[var(--color-text-secondary)]">{email}</p>
              {phone && <p className="text-[var(--color-text-secondary)]">{phone}</p>}
              {ntrp && <p className="text-[var(--color-text-secondary)]">NTRP {ntrp}</p>}
            </div>
          </ManageSection>

          {/* Tournament details */}
          <ManageSection title={t.registrationForm.sections.tournamentDetails}>
            {activeRegs.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{rp.lookupNoResult}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeRegs.map((reg) => {
                  const cat = categories.find((c) => c.id === reg.categoryId);
                  const label = cat
                    ? (locale === "ko" ? (cat.labelKo ?? cat.label) : cat.label)
                    : reg.categoryId;
                  const partnerName = lookupResult.partnerNames[reg.categoryId];

                  return (
                    <div
                      key={reg.id}
                      className="rounded-lg border border-[var(--color-border-ui)] bg-[var(--color-surface-muted)] px-4 py-3"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
                        {partnerName && (
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            with {partnerName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ManageSection>
        </div>
      </PageContainer>
    );
  }

  // ─── Lookup view ──────────────────────────────────────────────────────────

  // While auto-looking-up via initialEmail, show a spinner instead of the form
  if (lookupLoading && initialEmail && !lookupError) {
    return (
      <PageContainer title={rp.manageHeroTitle} contentMaxWidth="max-w-[var(--form-max-width)]">
        <SpinnerPage />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={rp.manageHeroTitle} contentMaxWidth="max-w-[var(--form-max-width)]">
      <div className="flex w-full flex-col gap-4">
        <Field
          variant="email"
          id="lookup-email"
          label={t.shared.form.email}
          value={lookupEmail}
          onChange={(e) => setLookupEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
          placeholder={rp.lookupEmailPlaceholder}
        />
        {lookupError && (
          <p className="text-sm text-[var(--color-status-error)]">{lookupError}</p>
        )}
        <Button onClick={handleLookup} disabled={lookupLoading || !lookupEmail.trim()} className="gap-2">
          {lookupLoading && <Spinner className="h-4 w-4" />}
          {lookupLoading ? rp.lookingUpButton : rp.lookupButton}
        </Button>
      </div>
    </PageContainer>
  );
}
