"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { categoryChipClass, buildCategoryByIdMap, categoryLabelForId } from "@/lib/category/categories";
import type { CategoryRecord } from "@/lib/category/categories";
import { formatPhoneInput, isValidEmail, isValidNanpPhone, normalizePhone } from "@/lib/validation";
import { loadRegistrationFormData, formatPrice, totalFromCategories } from "@/lib/registration";
import { contactData } from "@/lib/contactData";
import { Field } from "@/app/components/ui/Field";
import { CheckboxField } from "@/app/components/ui/Checkbox";
import { useLocale } from "@/lib/locale-context";
import { Chip } from "@/app/components/ui/Chip";
import { Divider } from "@/app/components/ui/Divider";
import { PlayerForm } from "@/app/components/PlayerForm";
import { RegistrationSuccessModal } from "@/app/registration/RegistrationSuccessModal";

export type RegistrationFormHandle = {
  submit: () => void;
};

const FORM_SURFACE_CLASS =
  "bg-[var(--form-surface-bg)] text-[var(--color-text-primary)] [--section-text:var(--color-text-primary)] [--input-text:var(--color-text-primary)] [--input-bg:var(--form-surface-bg)] [--input-focus-border:var(--outline-blue-focus)] [--input-focus-ring:var(--outline-blue-focus-ring)]";

type FormState = {
  selectedPlayerId: string | null;
  fullNameEn: string;
  fullNameKo: string;
  email: string;
  phone: string;
  ntrp: string;
  clubs: string[];
  categories: string[];
  partnerNames: Record<string, string>;
  photoVideoConsent: boolean;
  engravingWanted: boolean;
  engravingText: string;
  nameOnEtransfer: string;
  etransferSent: boolean;
};

type Props = {
  mode?: "public" | "publicEdit";
  initialFormState?: Partial<FormState>;
  /** publicEdit: categories the player was originally registered in (used for refund detection). */
  originalCategories?: string[];
  /** publicEdit: player email used for identity verification on submit. */
  playerEmail?: string;
  /** publicEdit: tournament year. */
  year?: number;
  onClose?: () => void;
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
  /** Server-prefetched categories — skips client-side fetch when provided. */
  initialCategories?: CategoryRecord[];
  /** Server-prefetched club codes — skips client-side fetch when provided. */
  initialClubCodes?: string[];
};

type PlayerOption = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
};

const emptyFormState: FormState = {
  selectedPlayerId: null,
  fullNameEn: "",
  fullNameKo: "",
  email: "",
  phone: "",
  ntrp: "",
  clubs: [],
  categories: [],
  partnerNames: {},
  photoVideoConsent: false,
  engravingWanted: false,
  engravingText: "",
  nameOnEtransfer: "",
  etransferSent: false,
};

export const RegistrationForm = forwardRef<RegistrationFormHandle, Props>(function RegistrationForm(
  {
    mode = "public",
    initialFormState,
    originalCategories,
    playerEmail,
    year,
    onClose,
    onSuccess,
    onLoadingChange,
    initialCategories,
    initialClubCodes,
  },
  ref
) {
  const { locale, t } = useLocale();
  const rf = t.registrationForm;
  const rs = rf.sections;
  const isPublicEdit = mode === "publicEdit";

  const [form, setForm] = useState<FormState>(() => {
    const merged = { ...emptyFormState, ...(initialFormState ?? {}) };
    if (merged.phone) merged.phone = formatPhoneInput(merged.phone);
    if (merged.engravingText) merged.engravingText = merged.engravingText.slice(0, 25);
    return merged;
  });

  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  function setLoading(val: boolean) {
    onLoadingChangeRef.current?.(val);
  }

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clubOptions, setClubOptions] = useState<string[]>(() => initialClubCodes ?? []);
  const [categories, setCategories] = useState<CategoryRecord[]>(() => initialCategories ?? []);
  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);
  const [paymentEmailCopied, setPaymentEmailCopied] = useState(false);
  const paymentCopyTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (paymentCopyTimeoutRef.current) {
        clearTimeout(paymentCopyTimeoutRef.current);
        paymentCopyTimeoutRef.current = null;
      }
    },
    []
  );

  const copyPaymentEmail = useCallback(() => {
    const email = contactData.email;
    void navigator.clipboard.writeText(email).then(() => {
      setPaymentEmailCopied(true);
      if (paymentCopyTimeoutRef.current) clearTimeout(paymentCopyTimeoutRef.current);
      paymentCopyTimeoutRef.current = window.setTimeout(() => {
        paymentCopyTimeoutRef.current = null;
        setPaymentEmailCopied(false);
      }, 2000);
    });
  }, []);

  // Load clubs + categories on mount. Skipped when data is provided as props (server page path).
  // registrationFormCache deduplicates across multiple mounted instances.
  useEffect(() => {
    if (initialCategories?.length && initialClubCodes?.length) return;
    let cancelled = false;
    void loadRegistrationFormData().then((data) => {
      if (cancelled) return;
      setClubOptions(data.clubCodes);
      setCategories(data.categories);
    });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const totalCad = useMemo(() => totalFromCategories(form.categories.length), [form.categories.length]);

  // publicEdit: categories removed from original set
  const removedCategories = useMemo(
    () => (originalCategories ?? []).filter((c) => !form.categories.includes(c)),
    [originalCategories, form.categories]
  );

  // publicEdit: categories added that weren't in the original set → need new payment
  const newlyAddedCategories = useMemo(
    () => form.categories.filter((c) => !(originalCategories ?? []).includes(c)),
    [originalCategories, form.categories]
  );

  // publicEdit: removed categories not offset by new additions → will be marked "Refund Requested".
  // Each new addition "covers" one removal (the payment transfers); only excess removals need a refund.
  const refundCategories = useMemo(
    () => removedCategories.slice(newlyAddedCategories.length),
    [removedCategories, newlyAddedCategories]
  );

  const registrantPlayerIdNum = useMemo(() => {
    const n = form.selectedPlayerId ? Number(form.selectedPlayerId) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [form.selectedPlayerId]);

  const fetchPlayerOptionsByName = useCallback(
    async (query: string, opts?: { excludePlayerId?: number | null }) => {
      const name = query.trim();
      if (name.length < 1) return [] as PlayerOption[];
      try {
        const res = await fetch(`/api/players?name=${encodeURIComponent(name)}`);
        const list: PlayerOption[] = res.ok ? await res.json() : [];
        const ex = opts?.excludePlayerId;
        if (ex != null && Number.isFinite(ex)) {
          return list.filter((p) => p.id !== ex);
        }
        return list;
      } catch {
        return [];
      }
    },
    []
  );

  const loadRegistrantPlayers = useCallback(
    (q: string) => fetchPlayerOptionsByName(q),
    [fetchPlayerOptionsByName]
  );

  const loadPartnerPlayers = useCallback(
    (q: string) => fetchPlayerOptionsByName(q, { excludePlayerId: registrantPlayerIdNum }),
    [fetchPlayerOptionsByName, registrantPlayerIdNum]
  );

  const getPlayerOptionKey = useCallback((p: PlayerOption) => p.id, []);
  const getPlayerOptionLabelEn = useCallback((p: PlayerOption) => p.fullNameEn, []);
  const getPlayerOptionLabelKo = useCallback((p: PlayerOption) => p.fullNameKo?.trim() || p.fullNameEn, []);
  const getPartnerOptionLabel = useCallback((p: PlayerOption) => p.fullNameEn, []);
  const partnerDisplayName = useCallback((p: PlayerOption) => p.fullNameEn, []);

  const isPlaceholderEmail = (email: string) =>
    email.startsWith("partner-stub-") && email.includes("@placeholder.tomlee-open");

  const handleSelectPlayer = useCallback(
    (p: PlayerOption) => {
      updateForm({
        selectedPlayerId: String(p.id),
        fullNameEn: p.fullNameEn,
        fullNameKo: p.fullNameKo ?? "",
        email: isPlaceholderEmail(p.email) ? "" : p.email,
        phone: formatPhoneInput(p.phone ?? ""),
        ntrp: p.ntrp ?? "",
        clubs: p.clubs?.length ? p.clubs : [],
      });
    },
    [updateForm]
  );

  const buildRegistrationErrors = useCallback(
    (state: FormState, categoryRecords?: CategoryRecord[]): Record<string, string> => {
      const byId =
        categoryRecords !== undefined ? buildCategoryByIdMap(categoryRecords) : categoriesById;

      const err: Record<string, string> = {};

      if (!state.fullNameEn.trim()) err.fullNameEn = rf.errors.required;
      if (!state.email.trim()) err.email = rf.errors.required;
      else if (!isValidEmail(state.email)) err.email = rf.errors.invalidEmail;

      if (!state.phone.trim()) err.phone = rf.errors.required;
      else if (!isValidNanpPhone(state.phone)) err.phone = rf.errors.invalidPhone;

      if (!isPublicEdit && state.categories.length === 0) err.categories = rf.errors.selectAtLeastOneCategory;

      const doubles = state.categories.filter((c) => byId.get(c)?.isDoubles ?? false);
      doubles.forEach((cat) => {
        if (!(state.partnerNames[cat] ?? "").trim()) err[`partner-${cat}`] = rf.errors.partnerNameRequired;
      });

      if (state.engravingWanted && !state.engravingText.trim()) err.engravingText = rf.errors.required;

      if (!isPublicEdit) {
        if (!state.photoVideoConsent) err.photoVideoConsent = rf.errors.mediaConsentRequired;
        if (!state.nameOnEtransfer.trim()) err.nameOnEtransfer = rf.errors.nameOnEtransferRequired;
        if (!state.etransferSent) err.etransferSent = rf.errors.etransferSentRequired;
      }

      if (isPublicEdit) {
        const hasNew = state.categories.some((c) => !(originalCategories ?? []).includes(c));
        if (hasNew && !state.etransferSent) err.etransferSent = rf.errors.etransferSentRequired;
      }

      return err;
    },
    [rf, isPublicEdit, categoriesById, originalCategories]
  );

  // Keep a ref to form so applyBlurValidation doesn't need `form` as a dep,
  // which would make it a new function on every keystroke and force all sections to rerender.
  const formRef2 = useRef(form);
  formRef2.current = form;

  const applyBlurValidation = useCallback(
    (field: string, merge?: Partial<FormState>) => {
      const snapshot: FormState = { ...formRef2.current, ...merge };
      const all = buildRegistrationErrors(snapshot);

      setFieldErrors((prev) => {
        const next = { ...prev };
        if (all[field]) next[field] = all[field];
        else delete next[field];
        return next;
      });
    },
    [buildRegistrationErrors]
  );

  function validateRegistrationForm(categoryRecords?: CategoryRecord[]): boolean {
    const err = buildRegistrationErrors(form, categoryRecords);
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  }

  const categoryAvailableOptions = useMemo(
    () =>
      categories.map((cat) => ({
        id: cat.id,
        label: categoryLabelForId(categoriesById, cat.id, locale),
      })),
    [categories, categoriesById, locale]
  );

  const handleCategoriesMultiselectChange = useCallback(
    (nextIds: string[]) => {
      let prevCats: string[] = [];

      setForm((prev) => {
        prevCats = prev.categories;
        const prevSet = new Set(prev.categories);
        const nextSet = new Set(nextIds);
        const partnerNames = { ...prev.partnerNames };

        for (const id of prev.categories) {
          if (!nextSet.has(id)) delete partnerNames[id];
        }

        for (const id of nextIds) {
          if (!prevSet.has(id) && (categoriesById.get(id)?.isDoubles ?? false)) {
            partnerNames[id] = partnerNames[id] ?? "";
          }
        }

        return { ...prev, categories: nextIds, partnerNames };
      });

      setFieldErrors((fe) => {
        const n = { ...fe };
        delete n.categories;
        for (const id of prevCats) {
          if (!nextIds.includes(id)) delete n[`partner-${id}`];
        }
        for (const id of nextIds) {
          if (!prevCats.includes(id) && (categoriesById.get(id)?.isDoubles ?? false)) {
            delete n[`partner-${id}`];
          }
        }
        return n;
      });
    },
    []
  );


  const categoryChipLabel = useCallback(
    (catId: string) => categoryLabelForId(categoriesById, catId, locale),
    [categoriesById, locale]
  );

  const categorySelectedOptions = useMemo(
    () => form.categories.map((catId) => ({
      id: catId,
      label: categoryChipLabel(catId),
      chipClassName: categoryChipClass(catId),
    })),
    [form.categories, categoryChipLabel]
  );

  const updatePartnerForCategory = useCallback((catId: string, name: string) => {
    setForm((prev) => ({
      ...prev,
      partnerNames: { ...prev.partnerNames, [catId]: name },
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`partner-${catId}`];
      return next;
    });
  }, []);

  async function handlePublicSubmit() {
    let submitCategories: CategoryRecord[] = categories;
    if (!(initialCategories && initialClubCodes)) {
      const data = await loadRegistrationFormData();
      setClubOptions(data.clubCodes);
      setCategories(data.categories);
      submitCategories = data.categories;
    }
    if (!validateRegistrationForm(submitCategories)) return;

    const byId = buildCategoryByIdMap(submitCategories);
    const doubles = form.categories.filter((c) => byId.get(c)?.isDoubles ?? false);

    setLoading(true);
    try {
      const partnerNameLegacy =
        doubles.length > 0
          ? (form.partnerNames[doubles[0]] ?? "").trim() ||
            (Object.values(form.partnerNames).find((v) => v.trim()) ?? "")
          : "";

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: form.selectedPlayerId || undefined,
          fullNameEn: form.fullNameEn.trim(),
          fullNameKo: form.fullNameKo.trim() || undefined,
          email: form.email.trim(),
          phone: normalizePhone(form.phone) || undefined,
          categories: form.categories,
          ntrp: form.ntrp || undefined,
          clubs: form.clubs.length ? form.clubs : undefined,
          nameOnEtransfer: form.nameOnEtransfer.trim() || undefined,
          partnerName: partnerNameLegacy,
          partnerNames: doubles.length > 0 ? form.partnerNames : undefined,
          photoVideoConsent: form.photoVideoConsent,
          engraving: form.engravingWanted ? form.engravingText.trim().slice(0, 25) : undefined,
          notes: form.etransferSent ? "E-transfer sent by registrant." : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors({ submit: data.error || rf.errors.registrationFailed });
        return;
      }

      setSuccessMessage(rf.success.body);
      setShowSuccessModal(true);
      setForm(emptyFormState);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublicEditSave() {
    if (!playerEmail) return;
    let submitCategories: CategoryRecord[] = categories;
    if (!(initialCategories && initialClubCodes)) {
      const data = await loadRegistrationFormData();
      setClubOptions(data.clubCodes);
      setCategories(data.categories);
      submitCategories = data.categories;
    }
    if (!validateRegistrationForm(submitCategories)) return;

    const byId = buildCategoryByIdMap(submitCategories);
    const doubles = form.categories.filter((c) => byId.get(c)?.isDoubles ?? false);

    setLoading(true);
    try {
      const partnerNameLegacy =
        doubles.length > 0
          ? (form.partnerNames[doubles[0]] ?? "").trim() ||
            (Object.values(form.partnerNames).find((v) => v.trim()) ?? "")
          : "";

      const res = await fetch("/api/registrations/self", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: playerEmail,
          year: year ?? new Date().getFullYear(),
          fullNameEn: form.fullNameEn.trim(),
          fullNameKo: form.fullNameKo.trim() || undefined,
          phone: normalizePhone(form.phone) || undefined,
          ntrp: form.ntrp || undefined,
          clubs: form.clubs.length ? form.clubs : [],
          categories: form.categories,
          partnerName: partnerNameLegacy,
          partnerNames: doubles.length > 0 ? form.partnerNames : undefined,
          photoVideoConsent: form.photoVideoConsent,
          engraving: form.engravingWanted ? form.engravingText.trim().slice(0, 25) : undefined,
          nameOnEtransfer: form.nameOnEtransfer.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors({ submit: json.error || rf.errors.registrationFailed });
        return;
      }

      setSuccessMessage(rf.success.body);
      setShowSuccessModal(true);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  const handlePublicSubmitRef = useRef(handlePublicSubmit);
  handlePublicSubmitRef.current = handlePublicSubmit;

  const handlePublicEditSaveRef = useRef(handlePublicEditSave);
  handlePublicEditSaveRef.current = handlePublicEditSave;

  useImperativeHandle(
    ref,
    () => ({
      submit() {
        if (isPublicEdit) {
          void handlePublicEditSaveRef.current();
        } else {
          void handlePublicSubmitRef.current();
        }
      },
    }),
    [isPublicEdit]
  );

  const sectionTitleClass = "text-h3 mb-2 [color:var(--section-text)]";
  const sectionAfterDividerClass = "pt-8";
  const sectionFieldGridClass = "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-4 md:gap-y-4";

  return (
    <div className={FORM_SURFACE_CLASS}>
      {showSuccessModal ? (
        <RegistrationSuccessModal
          message={successMessage}
          onClose={() => {
            setShowSuccessModal(false);
            onClose?.();
          }}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4" aria-labelledby="registration-section-personal">
        <h3 id="registration-section-personal" className={sectionTitleClass}>
          {rs.personalDetails}
        </h3>

        <PlayerForm<PlayerOption>
          values={{
            fullNameEn: form.fullNameEn,
            fullNameKo: form.fullNameKo,
            email: form.email,
            phone: form.phone,
            ntrp: form.ntrp,
            clubs: form.clubs,
          }}
          onChange={(updates) => {
            if ("phone" in updates && updates.phone !== undefined) {
              updateForm({ ...updates, phone: formatPhoneInput(updates.phone) });
            } else {
              updateForm(updates);
            }
          }}
          clubOptions={clubOptions}
          idPrefix="registration"
          errors={fieldErrors}
          required={{ fullNameEn: true, email: true, phone: true }}
          nameCombobox={{
            loadOptions: loadRegistrantPlayers,
            onSelect: handleSelectPlayer,
            getOptionKey: getPlayerOptionKey,
            getOptionLabelEn: getPlayerOptionLabelEn,
            getOptionLabelKo: getPlayerOptionLabelKo,
          }}
          onFieldBlur={(field, value) => {
            if (field === "phone") {
              const n = normalizePhone(value);
              const nextPhone = n || (value.trim() ? formatPhoneInput(value) : "");
              if (n) updateForm({ phone: n });
              else if (value.trim()) updateForm({ phone: formatPhoneInput(value) });
              applyBlurValidation("phone", { phone: nextPhone });
            } else {
              applyBlurValidation(field, { [field]: value } as Partial<FormState>);
            }
          }}
          phoneInputProps={{ inputMode: "numeric", autoComplete: "tel-national", placeholder: "000-000-0000" }}
        />
      </section>

      <Divider className="mt-8" />

      <section
        className={`${sectionFieldGridClass} text-[var(--color-text-primary)] ${sectionAfterDividerClass}`}
        aria-labelledby="registration-section-tournament"
      >
        <h3 id="registration-section-tournament" className={`${sectionTitleClass} md:col-span-2`}>
          {rs.tournamentDetails}
        </h3>

        <div className="md:col-span-2">
          <Field
            label={rf.fields.categories}
            required
            error={fieldErrors.categories && <p className="form-field-error">{fieldErrors.categories}</p>}
            variant="multiselect"
            id="registration-categories-multiselect"
            selected={categorySelectedOptions}
            available={categoryAvailableOptions}
            onChange={handleCategoriesMultiselectChange}
            placeholder={rf.fields.searchCategoriesPlaceholder}
            searchable={false}
          />
          {isPublicEdit && refundCategories.length > 0 && (
            <div className="mt-2 rounded-md border border-[color:var(--color-status-warning-border,#d97706)] bg-[var(--color-status-warning-bg-subtle,#fffbeb)] px-3 py-2 text-sm text-[var(--color-status-warning-text,#92400e)]">
              <p className="m-0 font-medium">Refund will be requested for:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {refundCategories.map((catId) => (
                  <Chip
                    key={`refund-${catId}`}
                    className={categoryChipClass(catId)}
                    label={categoryLabelForId(categoriesById, catId, locale)}
                  />
                ))}
              </div>
              <p className="m-0 mt-1.5 text-xs opacity-80">
                Our team will process the refund and update the status.
              </p>
            </div>
          )}
        </div>

        {form.categories
          .filter((catId) => categoriesById.get(catId)?.isDoubles ?? false)
          .map((catId) => (
            <div key={`partner-row-${catId}`} className="md:col-span-2">
              <Field<PlayerOption>
                label={`${rf.fields.partnerName} (${categoryLabelForId(categoriesById, catId, locale)})`}
                required
                error={fieldErrors[`partner-${catId}`] && <p className="form-field-error">{fieldErrors[`partner-${catId}`]}</p>}
                variant="combobox"
                id={`registration-partner-${catId}`}
                value={form.partnerNames[catId] ?? ""}
                onValueChange={(v) => updatePartnerForCategory(catId, v)}
                loadOptions={loadPartnerPlayers}
                onSelect={(p) => updatePartnerForCategory(catId, partnerDisplayName(p))}
                getOptionKey={getPlayerOptionKey}
                getOptionLabel={getPartnerOptionLabel}
                aria-invalid={Boolean(fieldErrors[`partner-${catId}`])}
                onBlur={(e) =>
                  applyBlurValidation(`partner-${catId}`, {
                    partnerNames: { ...form.partnerNames, [catId]: e.target.value },
                  })
                }
              />
            </div>
          ))}
      </section>

      <Divider className="mt-8" />

      {!isPublicEdit && (
        <section
          className={`flex max-w-[var(--form-max-width)] flex-col gap-4 ${sectionAfterDividerClass}`}
          aria-labelledby="registration-section-media"
        >
          <h3 id="registration-section-media" className={sectionTitleClass}>
            {rs.mediaConsent}
          </h3>
          <CheckboxField
            checked={form.photoVideoConsent}
            onChange={(e) => updateForm({ photoVideoConsent: e.target.checked })}
            onBlur={(e) => applyBlurValidation("photoVideoConsent", { photoVideoConsent: e.currentTarget.checked })}
          >
            {rf.helper.mediaConsent} <span className="text-[var(--form-required-mark)]">*</span>
          </CheckboxField>
          {fieldErrors.photoVideoConsent && <p className="form-field-error">{fieldErrors.photoVideoConsent}</p>}
        </section>
      )}

      <Divider className="mt-8" />

      <section
        className={`w-full max-w-none ${sectionAfterDividerClass}`}
        aria-labelledby="registration-section-engraving"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h3 id="registration-section-engraving" className={sectionTitleClass}>
              {rs.tumblerEngraving}
            </h3>
            <CheckboxField
              checked={form.engravingWanted}
              onChange={(e) => {
                const checked = e.target.checked;
                updateForm(checked ? { engravingWanted: true } : { engravingWanted: false, engravingText: "" });
              }}
            >
              {rf.helper.tumblerEngraving}
            </CheckboxField>
            {form.engravingWanted ? (
              <Field
                label={rf.fields.engravingText}
                required
                error={fieldErrors.engravingText && <p className="form-field-error">{fieldErrors.engravingText}</p>}
                variant="text"
                id="registration-engraving-text"
                value={form.engravingText}
                onChange={(e) => updateForm({ engravingText: e.target.value.slice(0, 25) })}
                onBlur={(e) => applyBlurValidation("engravingText", { engravingText: e.target.value.slice(0, 25) })}
                maxLength={25}
                aria-invalid={Boolean(fieldErrors.engravingText)}
              />
            ) : null}
          </div>

          <div className="flex w-full min-w-0 shrink-0 flex-col sm:flex-1 sm:self-stretch">
            <div
              className="flex min-h-[12rem] w-full flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] bg-[var(--color-surface-strong)] px-3 py-3 text-center text-xs text-[var(--color-text-tertiary)]"
              role="img"
              aria-label={rf.fields.engravingPreviewPlaceholder}
            >
              {rf.fields.engravingPreviewPlaceholder}
            </div>
          </div>
        </div>
      </section>

      <Divider className="mt-8" />

      <section
        className={`${sectionFieldGridClass} text-[var(--color-text-primary)] ${sectionAfterDividerClass}`}
        aria-labelledby="registration-section-payment"
      >
        <h3 id="registration-section-payment" className={`${sectionTitleClass} md:col-span-2`}>
          {rs.paymentInformation}
        </h3>

        {(!isPublicEdit || newlyAddedCategories.length > 0) && (
          <div className="md:col-span-2 flex flex-col gap-2 rounded-lg border border-[color:var(--input-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] md:gap-3 md:px-4 md:py-3">
            {isPublicEdit ? (
              <>
                <p className="m-0 font-medium text-[var(--color-text-primary)]">
                  New categories require additional payment:
                </p>
                <div className="flex flex-wrap gap-2">
                  {newlyAddedCategories.map((catId) => (
                    <Chip
                      key={`new-cat-${catId}`}
                      className={categoryChipClass(catId)}
                      label={categoryLabelForId(categoriesById, catId, locale)}
                    />
                  ))}
                </div>
                <p className="m-0 text-[var(--color-text-primary)]">
                  {rf.summary.line
                    .replace("{count}", String(newlyAddedCategories.length))
                    .replace("{total}", formatPrice(totalFromCategories(newlyAddedCategories.length)))}
                </p>
              </>
            ) : (
              <>
                <p className="m-0 text-[var(--color-text-primary)]">
                  {rf.summary.line
                    .replace("{count}", String(form.categories.length))
                    .replace("{total}", formatPrice(totalCad))}
                </p>
                {form.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.categories.map((catId) => (
                      <Chip
                        key={`summary-cat-${catId}`}
                        className={categoryChipClass(catId)}
                        label={categoryLabelForId(categoriesById, catId, locale)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex min-w-0 flex-nowrap items-center gap-1.5 text-left sm:gap-2">
              <span className="shrink-0 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                {rf.summary.etransferLabel}
              </span>
              <code
                className="shrink-0 w-fit select-all rounded bg-[var(--color-surface-strong)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-primary)] sm:px-2 sm:py-1 sm:text-sm"
                title={contactData.email}
              >
                {contactData.email}
              </code>
              <button
                type="button"
                onClick={copyPaymentEmail}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] sm:h-8 sm:w-8"
                aria-label={paymentEmailCopied ? rf.summary.emailCopied : rf.summary.copyEmail}
              >
                {paymentEmailCopied ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <Field
          label={rf.fields.nameOnEtransfer}
          required
          wrapperClassName="max-w-[var(--form-max-width)] md:max-w-none md:col-span-2"
          error={fieldErrors.nameOnEtransfer && <p className="form-field-error">{fieldErrors.nameOnEtransfer}</p>}
          variant="text"
          id="registration-nameOnEtransfer"
          value={form.nameOnEtransfer}
          onChange={(e) => updateForm({ nameOnEtransfer: e.target.value })}
          onBlur={(e) => applyBlurValidation("nameOnEtransfer", { nameOnEtransfer: e.target.value })}
        />

        {(!isPublicEdit || newlyAddedCategories.length > 0) && (
          <div className="md:col-span-2">
            <CheckboxField
              checked={form.etransferSent}
              onChange={(e) => updateForm({ etransferSent: e.target.checked })}
              onBlur={(e) => applyBlurValidation("etransferSent", { etransferSent: e.currentTarget.checked })}
            >
              {rf.helper.etransferSent} <span className="text-[var(--form-required-mark)]">*</span>
            </CheckboxField>
            {fieldErrors.etransferSent && <p className="form-field-error">{fieldErrors.etransferSent}</p>}
          </div>
        )}

        {fieldErrors.submit && <p className="form-field-error md:col-span-2">{fieldErrors.submit}</p>}
      </section>
    </div>
  );
});