"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { EntityForm, type FormValues } from "@/app/components/forms";
import { Button } from "@/app/components/ui/Button";
import { Spinner } from "@/app/components/ui/Spinner";
import { Callout } from "@/app/components/ui/Callout";
import { Field } from "@/app/components/ui/Field";
import { PageContainer } from "@/app/components/PageContainer";
import { giveawayFields, type GiveawayOptionRecord } from "@/lib/field-configs";
import { scrollToTop } from "@/lib/utils";
import { updateFiltersInUrl } from "@/lib/filterState";
import { ChoiceCard } from "@/app/components/ui/ChoiceCard";

type PlayerInfo = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
};

type PlayerCandidate = { id: number; fullNameEn: string; fullNameKo: string | null };

type LookupResponse = {
  player: PlayerInfo;
  isAdmin: boolean;
  hasRegistration: boolean;
  options: GiveawayOptionRecord[];
  choice: {
    id: string;
    optionId: string;
    optionId2: string | null;
    pickupClub: string | null;
    pickupNote: string | null;
  } | null;
};

type Props = {
  year: number;
  initialOptions: GiveawayOptionRecord[];
};

const EMPTY: FormValues = {};


function readSubmittedFromUrl(): {
  submitted: boolean;
  values: FormValues;
  isAdmin: boolean;
} {
  if (typeof window === "undefined")
    return { submitted: false, values: EMPTY, isAdmin: false };
  const p = new URLSearchParams(window.location.search);
  if (p.get("submitted") !== "1")
    return { submitted: false, values: EMPTY, isAdmin: false };
  return {
    submitted: true,
    isAdmin: p.get("admin") === "1",
    values: {
      optionId: p.get("optionId") ?? "",
      optionId2: p.get("optionId2") ?? "",
    },
  };
}

export function GiveawayHub({ year, initialOptions }: Props) {
  const { t } = useLocale();
  const g = t.giveawayPage;

  // ── Step 1: Email lookup ────────────────────────────────────────────────────
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);

  // step: 1 = email input, "pick" = name selector (multiple matches), 2 = player form (non-admin), 3 = admin form (both options)
  const [step, setStep] = useState<1 | "pick" | 2 | 3>(1);
  const [playerCandidates, setPlayerCandidates] = useState<PlayerCandidate[]>([]);

  function applyLookupResponse(data: LookupResponse) {
    setLookupResult(data);
    if (data.choice) {
      setValues({
        optionId: data.choice.optionId,
        optionId2: data.choice.optionId2 ?? "",
      });
      setExistingId(data.choice.id);
    } else {
      setValues(EMPTY);
      setExistingId(null);
    }
    if (data.options?.length) setOptions(data.options);
    setStep(2);
    scrollToTop();
  }

  async function doLookup(email: string) {
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/giveaway/${year}?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      );
      if (res.status === 404) {
        setLookupError(g.lookupNoResult);
        return;
      }
      if (res.status === 403) {
        setLookupError(g.lookupNotRegistered);
        return;
      }
      if (!res.ok) {
        setLookupError(g.lookupError);
        return;
      }
      const data = await res.json();
      if (data.multipleFound) {
        setPlayerCandidates(data.players);
        setStep("pick");
        scrollToTop();
        return;
      }
      applyLookupResponse(data as LookupResponse);
    } catch {
      setLookupError(g.lookupError);
    } finally {
      setLookupLoading(false);
    }
  }

  async function doLookupById(playerId: number) {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/giveaway/${year}?playerId=${playerId}`);
      if (!res.ok) {
        setLookupError(g.lookupError);
        return;
      }
      applyLookupResponse(await res.json() as LookupResponse);
    } catch {
      setLookupError(g.lookupError);
    } finally {
      setLookupLoading(false);
    }
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  const [values, setValues] = useState<FormValues>(
    () => readSubmittedFromUrl().values,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [options, setOptions] =
    useState<GiveawayOptionRecord[]>(initialOptions);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    () => readSubmittedFromUrl().submitted,
  );
  const [existingId, setExistingId] = useState<string | null>(null);

  const isAdmin = lookupResult?.isAdmin ?? readSubmittedFromUrl().isAdmin;
  const canGetSecond = isAdmin && (lookupResult?.hasRegistration ?? false);
  const player = lookupResult?.player ?? null;

  // Non-admin step 2: first option → Submit
  const playerFields = useMemo(
    () => giveawayFields(t, options, "player"),
    [t, options],
  );

  // Admin step 2: first option only → Next
  const adminFirstFields = useMemo(
    () => giveawayFields(t, options, "admin-first"),
    [t, options],
  );

  // Admin step 3: second option → Submit
  const adminSecondFields = useMemo(
    () => giveawayFields(t, options, "admin-second"),
    [t, options],
  );

  const handleChange = useCallback((updates: Partial<FormValues>) => {
    setValues((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const handleNext = () => {
    if (!values.optionId) {
      setErrors({ optionId: g.errors.choiceRequired });
      return;
    }
    setErrors({});
    setStep(3);
    scrollToTop();
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!values.optionId) errs.optionId = g.errors.choiceRequired;
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setApiError(null);
    setStockError(null);
    try {
      const res = await fetch(`/api/giveaway/${year}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player!.id,
          optionId: values.optionId,
          optionId2: canGetSecond ? values.optionId2 || null : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          options?: GiveawayOptionRecord[];
        };
        if (res.status === 409 && data.options?.length)
          setOptions(data.options);
        if (res.status === 409) {
          setStockError(data.error ?? g.errors.submissionFailed);
          return;
        }
        setApiError(data.error ?? g.errors.submissionFailed);
        return;
      }
      const result = (await res.json()) as {
        id: string;
        options?: GiveawayOptionRecord[];
      };
      if (result.options?.length) setOptions(result.options);
      setExistingId(result.id);
      setSubmitted(true);
      updateFiltersInUrl({
        submitted: "1",
        optionId: String(values.optionId ?? ""),
        optionId2: canGetSecond ? String(values.optionId2 ?? "") : "",
        admin: isAdmin ? "1" : "",
      });
      scrollToTop();
    } catch {
      setApiError(g.errors.submissionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const chosenOption = options.find((o) => o.optionId === values.optionId);
  const chosenOption2 = options.find((o) => o.optionId === values.optionId2);

  // ── Confirmation ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PageContainer
        contentMaxWidth="max-w-[var(--form-max-width)]"
        title={g.heroTitle}
      >
        <div className="flex flex-col gap-4">
          <Callout variant="success" message={g.confirmationTitle} />
          {chosenOption && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {g.currentChoiceLabel}
              </p>
              <div className="rounded-xl border border-[var(--color-border-ui)] overflow-hidden">
                <ChoiceCard
                  displayOnly
                  label={chosenOption.label}
                  sublabel={chosenOption.ml ?? undefined}
                  imageSrc={chosenOption.imageSrc ?? undefined}
                  showImage
                  selected={false}
                  onClick={() => {}}
                />
              </div>
            </div>
          )}
          {canGetSecond && chosenOption2 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {g.secondCurrentChoiceLabel}
              </p>
              <div className="rounded-xl border border-[var(--color-border-ui)] overflow-hidden">
                <ChoiceCard
                  displayOnly
                  label={chosenOption2.label}
                  sublabel={chosenOption2.ml ?? undefined}
                  imageSrc={chosenOption2.imageSrc ?? undefined}
                  showImage
                  selected={false}
                  onClick={() => {}}
                />
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // ── Step 3: Admin — second option → Submit ─────────────────────────────────
  if (step === 3 && player) {
    return (
      <PageContainer
        contentMaxWidth="max-w-[var(--form-max-width)]"
        title={g.heroTitle}
      >
        <div className="flex flex-col gap-5">
          {stockError && <Callout variant="warning" message={stockError} />}
          <EntityForm
            fields={adminSecondFields}
            values={values}
            onChange={handleChange}
            errors={errors}
            error={apiError}
          >
            <div className="py-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gap-2"
              >
                {submitting && <Spinner className="h-4 w-4" />}
                {submitting
                  ? g.submittingButton
                  : existingId
                    ? g.updateButton
                    : g.submitButton}
              </Button>
            </div>
          </EntityForm>
        </div>
      </PageContainer>
    );
  }

  // ── Step 2: First option selection ─────────────────────────────────────────
  // Admin → "Next" advances to step 3; non-admin → "Submit" completes the form
  if (step === 2 && player) {
    return (
      <PageContainer
        contentMaxWidth="max-w-[var(--form-max-width)]"
        title={g.heroTitle}
      >
        <div className="flex flex-col gap-5">
          {stockError && <Callout variant="warning" message={stockError} />}
          <EntityForm
            fields={canGetSecond ? adminFirstFields : playerFields}
            values={values}
            onChange={handleChange}
            errors={errors}
            error={apiError}
          >
            <div className="py-2">
              {canGetSecond ? (
                <Button onClick={handleNext} className="w-full">
                  {g.lookupButton}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gap-2"
                >
                  {submitting && <Spinner className="h-4 w-4" />}
                  {submitting
                    ? g.submittingButton
                    : existingId
                      ? g.updateButton
                      : g.submitButton}
                </Button>
              )}
            </div>
          </EntityForm>
        </div>
      </PageContainer>
    );
  }

  // ── Step "pick": Multiple players found — name selector ────────────────────
  if (step === "pick") {
    return (
      <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]" title={g.heroTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">{g.lookupMultipleFound}</p>
          <div className="rounded-xl border border-[var(--color-border-ui)] overflow-hidden">
            {playerCandidates.map((p) => (
              <ChoiceCard
                key={p.id}
                label={p.fullNameEn}
                sublabel={p.fullNameKo ?? undefined}
                selected={false}
                onClick={() => doLookupById(p.id)}
              />
            ))}
          </div>
          <Button variant="secondary" onClick={() => setStep(1)}>{g.backButton}</Button>
        </div>
      </PageContainer>
    );
  }

  // ── Step 1: Email lookup ────────────────────────────────────────────────────
  return (
    <PageContainer
      contentMaxWidth="max-w-[var(--form-max-width)]"
      title={g.heroTitle}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {g.searchDescription}
        </p>

        <img
          src="/giveaway/tumblers-2026.png"
          alt={g.previewImageAlt}
          className="w-full rounded-lg object-cover"
        />
        <Field
          variant="email"
          id="giveaway-lookup-email"
          label={g.emailLookupLabel}
          value={lookupEmail}
          onChange={(e) => setLookupEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doLookup(lookupEmail);
          }}
          placeholder={g.emailLookupPlaceholder}
        />
        {lookupError && (
          <p className="text-sm text-[var(--color-status-error)]">
            {lookupError}
          </p>
        )}
        <Button
          onClick={() => doLookup(lookupEmail)}
          disabled={lookupLoading || !lookupEmail.trim()}
          className="gap-2"
        >
          {lookupLoading && <Spinner className="h-4 w-4" />}
          {lookupLoading ? g.lookingUpButton : g.lookupButton}
        </Button>
      </div>
    </PageContainer>
  );
}
