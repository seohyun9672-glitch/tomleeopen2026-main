"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PlayerForm, type PlayerFormValues } from "@/app/components/PlayerForm";
import { Field } from "@/app/components/ui/Field";
import { CheckboxField } from "@/app/components/ui/Checkbox";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { useLocale } from "@/lib/locale-context";
import { contactData } from "@/lib/contactData";
import { totalFromCategories, formatPrice } from "@/lib/registration";
import { categoryChipClass } from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerSearchResult = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
};

type CreatedEntry = { id: string; categoryId: string };

type Props = {
  categories: CategoryRecord[];
  year: number;
  player?: PlayerFormValues & { playerId?: number };
  categoryIds?: string[];
  partnerNames?: Record<string, string>;
  etransferSent?: boolean;
  mediaConsent?: boolean;
  isEdit?: boolean;
  onSuccess: (data?: { created: CreatedEntry[] }) => void;
  onCancel?: () => void;
  /** When provided, called instead of router.push after confirmation closes (used in admin modal context). */
  onComplete?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_PLAYER: PlayerFormValues = {
  fullNameEn: "",
  fullNameKo: "",
  email: "",
  phone: "",
  ntrp: "",
  clubs: [],
};

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function FormSection({ title, children }: { title: ReactNode; children: ReactNode }) {
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

// ─── RegistrationForm ─────────────────────────────────────────────────────────

export function RegistrationForm({
  categories,
  year,
  player,
  categoryIds = [],
  partnerNames: partnerNamesProp = {},
  etransferSent: etransferSentProp = false,
  mediaConsent: mediaConsentProp = false,
  isEdit = false,
  onSuccess,
  onCancel,
  onComplete,
}: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const rf = t.registrationForm;
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────────────────────

  const [playerValues, setPlayerValues] = useState<PlayerFormValues>(player ?? EMPTY_PLAYER);
  const [playerId, setPlayerId] = useState<number | undefined>(player?.playerId);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(categoryIds);
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>(partnerNamesProp);
  const [etransferSent, setEtransferSent] = useState(etransferSentProp);
  const [mediaConsent, setMediaConsent] = useState(mediaConsentProp);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Snapshot of initial values for change detection in edit mode
  const snapshot = useRef({ playerValues: player ?? EMPTY_PLAYER, categoryIds, partnerNames: partnerNamesProp, mediaConsent: mediaConsentProp });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CreatedEntry[] | null>(null);

  function resetForm() {
    setPlayerValues(EMPTY_PLAYER);
    setPlayerId(undefined);
    setSelectedCategoryIds([]);
    setPartnerNames({});
    setEtransferSent(false);
    setMediaConsent(false);
    setErrors({});
    setConfirmResult(null);
    if (onComplete) {
      onComplete();
    } else {
      router.push("/registration");
    }
  }

  // ─── Category options ──────────────────────────────────────────────────────

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: locale === "ko" ? (c.labelKo ?? c.label) : c.label,
    chipClassName: categoryChipClass(c.id),
  }));

  const selectedCategoryOptions = selectedCategoryIds.map((id) => {
    const cat = categories.find((c) => c.id === id);
    return {
      id,
      label: cat ? (locale === "ko" ? (cat.labelKo ?? cat.label) : cat.label) : id,
      chipClassName: categoryChipClass(id),
    };
  });

  const doublesCategoryIds = new Set(
    categories.filter((c) => c.isDoubles).map((c) => c.id)
  );

  const selectedDoublesIds = selectedCategoryIds.filter((id) => doublesCategoryIds.has(id));

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    const s = snapshot.current;
    const fields = ["fullNameEn", "fullNameKo", "email", "phone", "ntrp"] as const;
    for (const f of fields) {
      if (playerValues[f] !== s.playerValues[f]) return true;
    }
    if ([...playerValues.clubs].sort().join(",") !== [...s.playerValues.clubs].sort().join(",")) return true;
    if ([...selectedCategoryIds].sort().join(",") !== [...s.categoryIds].sort().join(",")) return true;
    for (const id of selectedDoublesIds) {
      if ((partnerNames[id] ?? "") !== (s.partnerNames[id] ?? "")) return true;
    }
    if (mediaConsent !== s.mediaConsent) return true;
    return false;
  }, [isEdit, playerValues, selectedCategoryIds, partnerNames, mediaConsent, selectedDoublesIds]);

  // ─── Player combobox ───────────────────────────────────────────────────────

  const loadPlayerOptions = useCallback(async (query: string): Promise<PlayerSearchResult[]> => {
    if (!query.trim()) return [];
    const res = await fetch(`/api/players?name=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  }, []);

  const onPlayerSelect = useCallback((player: PlayerSearchResult) => {
    setPlayerId(player.id);
    setPlayerValues({
      fullNameEn: player.fullNameEn,
      fullNameKo: player.fullNameKo ?? "",
      email: player.email,
      phone: player.phone ?? "",
      ntrp: player.ntrp ?? "",
      clubs: player.clubs,
    });
  }, []);

  // ─── Partner combobox ──────────────────────────────────────────────────────

  const loadPartnerOptions = useCallback(async (query: string): Promise<PlayerSearchResult[]> => {
    if (!query.trim()) return [];
    const res = await fetch(`/api/players?name=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  }, []);

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!playerValues.fullNameEn.trim()) errs.fullNameEn = rf.errors.required;
    if (!playerValues.email.trim()) errs.email = rf.errors.required;
    else if (!validateEmail(playerValues.email)) errs.email = rf.errors.invalidEmail;
    if (!playerValues.phone.trim()) errs.phone = rf.errors.required;
    if (selectedCategoryIds.length === 0) errs.categories = rf.errors.selectAtLeastOneCategory;
    for (const id of selectedDoublesIds) {
      if (!partnerNames[id]?.trim()) {
        errs[`partner-${id}`] = rf.errors.partnerNameRequired;
      }
    }
    if (!mediaConsent) errs.mediaConsent = rf.errors.mediaConsentRequired;
    if (!etransferSent) errs.etransferSent = rf.errors.etransferSentRequired;
    return errs;
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const endpoint = isEdit ? "/api/registrations/self" : "/api/registrations";
    const method = isEdit ? "PATCH" : "POST";

    const body = isEdit
      ? {
          email: playerValues.email,
          year,
          fullNameEn: playerValues.fullNameEn,
          fullNameKo: playerValues.fullNameKo || null,
          phone: playerValues.phone || null,
          ntrp: playerValues.ntrp || null,
          clubs: playerValues.clubs,
          categories: selectedCategoryIds,
          partnerNames,
          photoVideoConsent: mediaConsent,
        }
      : {
          tournamentYear: year,
          fullNameEn: playerValues.fullNameEn,
          fullNameKo: playerValues.fullNameKo || null,
          email: playerValues.email,
          phone: playerValues.phone || null,
          ntrp: playerValues.ntrp || null,
          clubs: playerValues.clubs,
          playerId,
          categories: selectedCategoryIds,
          partnerNames,
          photoVideoConsent: mediaConsent,
        };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          onSuccess();
        } else {
          setConfirmResult(data.created ?? []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrors({ submit: err.error ?? rf.errors.registrationFailed });
      }
    } catch {
      setErrors({ submit: rf.errors.registrationFailed });
    } finally {
      setSubmitting(false);
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(contactData.email.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalFee = totalFromCategories(selectedCategoryIds.length);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">

        {/* Section 1: Player details */}
        <FormSection title={rf.sections.playerDetails}>
          <PlayerForm
            values={playerValues}
            onChange={(updates) => setPlayerValues((prev) => ({ ...prev, ...updates }))}
            errors={errors}
            required={{ fullNameEn: true, email: true, phone: true }}
            nameCombobox={{
              loadOptions: loadPlayerOptions,
              onSelect: onPlayerSelect,
              getOptionKey: (p) => p.id,
              getOptionLabelEn: (p) => p.fullNameEn,
              getOptionLabelKo: (p) => p.fullNameKo ?? p.fullNameEn,
            }}
          />
        </FormSection>

        {/* Section 2: Tournament details */}
        <FormSection title={rf.sections.tournamentDetails}>
          <Field
            variant="multiselect"
            id="reg-categories"
            label={<>{rf.fields.categories} <span className="text-[var(--form-required-mark)]">*</span></>}
            selected={selectedCategoryOptions}
            available={categoryOptions}
            onChange={(ids) => {
              setSelectedCategoryIds(ids);
              setPartnerNames((prev) => {
                const next: Record<string, string> = {};
                for (const id of ids) {
                  if (doublesCategoryIds.has(id)) next[id] = prev[id] ?? "";
                }
                return next;
              });
            }}
            placeholder={rf.fields.searchCategoriesPlaceholder}
            searchable={false}
          />
          {errors.categories && (
            <p className="form-field-error">{errors.categories}</p>
          )}

          {selectedDoublesIds.map((id) => {
            const cat = categories.find((c) => c.id === id);
            const label = cat ? (locale === "ko" ? (cat.labelKo ?? cat.label) : cat.label) : id;
            return (
              <Field
                key={id}
                variant="combobox"
                id={`partner-${id}`}
                label={<>{rf.fields.partnerName} — {label} <span className="text-[var(--form-required-mark)]">*</span></>}
                value={partnerNames[id] ?? ""}
                onValueChange={(v) => setPartnerNames((prev) => ({ ...prev, [id]: v }))}
                loadOptions={loadPartnerOptions}
                onSelect={(p: PlayerSearchResult) =>
                  setPartnerNames((prev) => ({ ...prev, [id]: p.fullNameEn }))
                }
                getOptionKey={(p: PlayerSearchResult) => p.id}
                getOptionLabel={(p: PlayerSearchResult) =>
                  p.fullNameKo ? `${p.fullNameEn} · ${p.fullNameKo}` : p.fullNameEn
                }
                error={errors[`partner-${id}`] ? (
                  <p className="form-field-error">{errors[`partner-${id}`]}</p>
                ) : undefined}
              />
            );
          })}
        </FormSection>

        {/* Section 3: Payment details */}
        {selectedCategoryIds.length > 0 && (
          <FormSection title={rf.sections.paymentDetails}>
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
              <span className="font-medium text-[var(--color-text-primary)]">
                {t.etransfer.email}
              </span>
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
          </FormSection>
        )}

        {/* Consents */}
        <div className="flex flex-col gap-3">
          <div>
            <CheckboxField
              checked={etransferSent}
              onChange={(e) => setEtransferSent(e.target.checked)}
              required
            >
              {rf.helper.etransferSent}
            </CheckboxField>
            {errors.etransferSent && (
              <p className="form-field-error mt-1">{errors.etransferSent}</p>
            )}
          </div>

          <div>
            <CheckboxField
              checked={mediaConsent}
              onChange={(e) => setMediaConsent(e.target.checked)}
              required
            >
              {rf.helper.mediaConsent}
            </CheckboxField>
            {errors.mediaConsent && (
              <p className="form-field-error mt-1">{errors.mediaConsent}</p>
            )}
          </div>
        </div>

        {errors.submit && (
          <p className="text-sm text-[var(--color-status-error)]">{errors.submit}</p>
        )}

        <div className="flex items-center justify-between gap-4">
          <Button type="submit" disabled={submitting || !hasChanges}>
            {submitting
              ? (isEdit ? rf.buttons.saving : rf.buttons.submitting)
              : (isEdit ? rf.buttons.saveChanges : rf.buttons.submit)}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {rf.buttons.back}
            </Button>
          )}
        </div>
      </form>

      {/* Confirmation modal (new registration only) */}
      <Modal
        open={confirmResult !== null}
        onClose={resetForm}
        title={rp.confirmationTitle}
        closeLabel={rp.confirmationClose}
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
          <Button onClick={resetForm}>
            {rp.confirmationClose}
          </Button>
        </div>
      </Modal>
    </>
  );
}
