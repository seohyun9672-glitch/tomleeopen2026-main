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
import Link from "next/link";

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

export type FormSaveData = {
  playerValues: PlayerFormValues;
  playerId?: number;
  selectedCategoryIds: string[];
  partnerNames: Record<string, string>;
  partnerIds: Record<string, number>;
  nameOnEtransfer: string;
  etransferSent: boolean;
  mediaConsent: boolean;
  paymentReceived: boolean;
  notes?: string;
  adminComments?: string;
};

type Props = {
  categories: CategoryRecord[];
  year: number;
  player?: PlayerFormValues & { playerId?: number };
  categoryIds?: string[];
  partnerNames?: Record<string, string>;
  partnerIds?: Record<string, number>;
  nameOnEtransfer?: string;
  notes?: string;
  adminComments?: string;
  etransferSent?: boolean;
  mediaConsent?: boolean;
  isEdit?: boolean;
  onSuccess?: (data?: { created: CreatedEntry[] }) => void;
  onCancel?: () => void;
  /** When provided, called instead of router.push after confirmation closes (used in admin modal context). */
  onComplete?: () => void;
  /** When true, hides the KakaoTalk CTA in the confirmation modal and shows a simple success message. */
  omitCTA?: boolean;
  /** When provided, called on save instead of the public API (admin override). Hides payment section and shows Admin section. */
  onSaveOverride?: (data: FormSaveData) => Promise<void>;
  /** When provided, shows a delete button that calls this function. */
  onDelete?: () => Promise<void>;
  /** Admin-only initial values shown when onSaveOverride is set. */
  adminFields?: { paymentReceived?: boolean };
  /** When provided, the form renders with this id and hides its own submit buttons (parent controls submit via footer). */
  formId?: string;
  /** Called with true when a save is in progress, false when done. */
  onSavingChange?: (saving: boolean) => void;
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

function FormSection({ title, children, unstyled }: { title: ReactNode; children: ReactNode; unstyled?: boolean }) {
  if (unstyled) return <div className="flex flex-col gap-4">{children}</div>;
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
  partnerIds: partnerIdsProp = {},
  nameOnEtransfer: nameOnEtransferProp = "",
  notes: notesProp = "",
  adminComments: adminCommentsProp = "",
  etransferSent: etransferSentProp = false,
  mediaConsent: mediaConsentProp = false,
  isEdit = false,
  onSuccess,
  onCancel,
  onComplete,
  onSaveOverride,
  onDelete,
  adminFields,
  formId,
  onSavingChange,
  omitCTA = false,
}: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const rf = t.registrationForm;
  const router = useRouter();

  const isAdminContext = !!onSaveOverride;

  // ─── State ─────────────────────────────────────────────────────────────────

  const [playerValues, setPlayerValues] = useState<PlayerFormValues>(player ?? EMPTY_PLAYER);
  const [playerId, setPlayerId] = useState<number | undefined>(player?.playerId);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(categoryIds);
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>(partnerNamesProp);
  const [partnerIds, setPartnerIds] = useState<Record<string, number>>(partnerIdsProp);
  const [nameOnEtransfer, setNameOnEtransfer] = useState(nameOnEtransferProp);
  const [etransferSent, setEtransferSent] = useState(etransferSentProp);
  const [mediaConsent, setMediaConsent] = useState(mediaConsentProp);
  const [paymentReceived, setPaymentReceived] = useState(adminFields?.paymentReceived ?? false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState(notesProp);
  const [adminComments, setAdminComments] = useState(adminCommentsProp);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(...keys: string[]) {
    setErrors((prev) => {
      if (keys.every((k) => !(k in prev))) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  const snapshot = useRef({ playerValues: player ?? EMPTY_PLAYER, categoryIds, partnerNames: partnerNamesProp, mediaConsent: mediaConsentProp, notes: notesProp });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CreatedEntry[] | null>(null);
  const manageHref = locale === "ko" ? "/ko/registration/manage" : "/registration/manage";

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
      router.push(manageHref);
    }
  }

  // ─── Category options ──────────────────────────────────────────────────────

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: locale === "ko" ? (c.labelKo ?? c.label) : c.label,
    chipClassName: categoryChipClass(c.id),
    group: (locale === "ko" ? (c.categoryKo ?? c.category) : c.category) ?? undefined,
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
    if (notes !== s.notes) return true;
    return false;
  }, [isEdit, playerValues, selectedCategoryIds, partnerNames, mediaConsent, notes, selectedDoublesIds]);

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
    const all: PlayerSearchResult[] = await res.json();
    return all.filter((p) => p.id !== playerId);
  }, [playerId]);

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
    if (!isAdminContext) {
      if (!playerValues.ntrp.trim()) errs.ntrp = rf.errors.required;
      if (selectedCategoryIds.length > 0 && (!isEdit || priceChanged) && !nameOnEtransfer.trim()) errs.nameOnEtransfer = rf.errors.required;
      if (!mediaConsent) errs.mediaConsent = rf.errors.mediaConsentRequired;
      if (!etransferSent) errs.etransferSent = rf.errors.etransferSentRequired;
    }
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
    onSavingChange?.(true);

    if (onSaveOverride) {
      try {
        await onSaveOverride({
          playerValues,
          playerId,
          selectedCategoryIds,
          partnerNames,
          partnerIds,
          nameOnEtransfer,
          etransferSent,
          mediaConsent,
          paymentReceived,
          notes,
          adminComments,
        });
      } catch {
        setErrors({ submit: rf.errors.registrationFailed });
      } finally {
        setSubmitting(false);
        onSavingChange?.(false);
      }
      return;
    }

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
          partnerIds,
          nameOnEtransfer: nameOnEtransfer || null,
          photoVideoConsent: mediaConsent,
          notes: notes || null,
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
          partnerIds,
          nameOnEtransfer: nameOnEtransfer || null,
          photoVideoConsent: mediaConsent,
          notes: notes || null,
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
          onSuccess?.();
        } else {
          onSuccess?.();
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
      onSavingChange?.(false);
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(contactData.email.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const originalFee = totalFromCategories(categoryIds.length);
  const totalFee = totalFromCategories(selectedCategoryIds.length);
  const priceChanged = isEdit && totalFee !== originalFee;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <form id={formId} onSubmit={handleSubmit} noValidate className="mx-auto flex w-full max-w-[var(--form-max-width)] flex-col gap-4">
        {!formId && !isEdit && (
          <Link
            href={manageHref}
            className="self-start text-sm text-[var(--link-default)] underline"
          >
            {rp.returningRegistrantButton}
          </Link>
        )}

        {/* Section 1: Player details */}
        <FormSection title={rf.sections.playerDetails} unstyled={isAdminContext || !!formId}>
          <PlayerForm
            values={playerValues}
            onChange={(updates) => {
              setPlayerValues((prev) => ({ ...prev, ...updates }));
              clearError(...Object.keys(updates));
            }}
            errors={errors}
            required={{
              fullNameEn: true,
              fullNameKo: false,
              email: true,
              phone: true,
              ntrp: !isAdminContext,
            }}
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
        <FormSection title={rf.sections.tournamentDetails} unstyled={isAdminContext || !!formId}>
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
              clearError("categories");
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
                onValueChange={(v) => { setPartnerNames((prev) => ({ ...prev, [id]: v })); clearError(`partner-${id}`); }}
                loadOptions={loadPartnerOptions}
                onSelect={(p: PlayerSearchResult) => {
                  const name = locale === "ko" ? (p.fullNameKo ?? p.fullNameEn) : p.fullNameEn;
                  setPartnerNames((prev) => ({ ...prev, [id]: name }));
                  setPartnerIds((prev) => ({ ...prev, [id]: p.id }));
                }}
                getOptionKey={(p: PlayerSearchResult) => p.id}
                getOptionLabel={(p: PlayerSearchResult) =>
                  locale === "ko" ? (p.fullNameKo ?? p.fullNameEn) : p.fullNameEn
                }
                error={errors[`partner-${id}`] ? (
                  <p className="form-field-error">{errors[`partner-${id}`]}</p>
                ) : undefined}
              />
            );
          })}
        </FormSection>

        {/* Section 3: Additional details */}
        <FormSection title={rf.sections.additionalDetails} unstyled={isAdminContext || !!formId}>
          <Field
            variant="textarea"
            id="reg-notes"
            label={rf.fields.notes}
            value={notes}
            onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
            rows={2}
          />
          {!isAdminContext && (
            <div>
              <CheckboxField
                checked={mediaConsent}
                onChange={(e) => { setMediaConsent(e.target.checked); clearError("mediaConsent"); }}
                required
              >
                {rf.helper.mediaConsent}
              </CheckboxField>
              {errors.mediaConsent && (
                <p className="form-field-error mt-1">{errors.mediaConsent}</p>
              )}
            </div>
          )}

          {/* Admin section */}
          {isAdminContext && (
            <>
              <hr className="border-[var(--color-border-ui)]" />
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                Admin
              </p>
              <CheckboxField
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
              >
                Payment Received
              </CheckboxField>
              <Field
                variant="text"
                id="reg-name-on-etransfer"
                label={rf.fields.nameOnEtransfer}
                value={nameOnEtransfer}
                onChange={(e) => setNameOnEtransfer(e.target.value)}
              />
              <Field
                variant="textarea"
                id="reg-admin-comments"
                label="Comments (admin only)"
                value={adminComments}
                onChange={(e) => setAdminComments((e.target as HTMLTextAreaElement).value)}
                rows={2}
              />
            </>
          )}
        </FormSection>

        {/* Section 4: Payment details — always visible for public; full payment fields only for new reg or price change */}
        {selectedCategoryIds.length > 0 && !isAdminContext && (
          <FormSection title={rf.sections.paymentDetails}>
            {isEdit && priceChanged && (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--color-surface-muted)] px-4 py-2 text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  {rf.summary.total}: {formatPrice(originalFee)} → {formatPrice(totalFee)}
                </span>
              </div>
            )}
            {!isEdit && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {selectedCategoryIds.length} × {formatPrice(50)}
                </span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {rf.summary.total}: {formatPrice(totalFee)}
                </span>
              </div>
            )}
            {(!isEdit || priceChanged) && (
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
            )}
            <Field
              variant="text"
              id="reg-name-on-etransfer"
              label={<>{rf.fields.nameOnEtransfer}{(!isEdit || priceChanged) && <> <span className="text-[var(--form-required-mark)]">*</span></>}</>}
              value={nameOnEtransfer}
              onChange={(e) => { setNameOnEtransfer(e.target.value); clearError("nameOnEtransfer"); }}
              aria-invalid={Boolean(errors.nameOnEtransfer)}
              error={errors.nameOnEtransfer ? <p className="form-field-error">{errors.nameOnEtransfer}</p> : undefined}
            />
            {(!isEdit || priceChanged) && (
              <div>
                <CheckboxField
                  checked={etransferSent}
                  onChange={(e) => { setEtransferSent(e.target.checked); clearError("etransferSent"); }}
                  required
                >
                  {rf.helper.etransferSent}
                </CheckboxField>
                {errors.etransferSent && (
                  <p className="form-field-error mt-1">{errors.etransferSent}</p>
                )}
              </div>
            )}
          </FormSection>
        )}

        {errors.submit && (
          <p className="text-sm text-[var(--color-status-error)]">{errors.submit}</p>
        )}

        {!formId && !onSaveOverride && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
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
            {onDelete && (
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await onDelete(); } finally { setDeleting(false); }
                }}
              >
                {deleting ? t.adminPage.actions.deleting : t.adminPage.actions.delete}
              </Button>
            )}
          </div>
        )}
      </form>

      {/* Confirmation modal (new registration only) */}
      <Modal
        open={confirmResult !== null}
        onClose={resetForm}
        title={rp.confirmationTitle}
        closeLabel={rp.confirmationClose}
        secondaryAction={omitCTA ? undefined : { label: rp.confirmationManage, onClick: resetForm }}
        primaryAction={omitCTA ? undefined : { label: rp.confirmationButton, onClick: () => { window.open(contactData.kakao.href, "_blank"); resetForm(); } }}
      >
        <div className="flex flex-col gap-4">
          {omitCTA ? (
            <p className="text-[var(--color-text-secondary)]">
              {rp.confirmationAdminBody.replace("{name}", playerValues.fullNameEn)}
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
