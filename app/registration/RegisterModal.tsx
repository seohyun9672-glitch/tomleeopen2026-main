"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Field } from "@/app/components/ui/Field";
import { Label } from "@/app/components/ui/Label";
import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";
import type { CategoryRecord } from "@/lib/category/categories";

import { RegistrationForm, type RegistrationFormHandle } from "./RegistrationForm";

type LookupRegistration = {
  id: string;
  categoryId: string;
  status: string;
  photoVideoConsent: boolean;
  engraving: string | null;
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
  registrations: LookupRegistration[];
  partnerNames: Record<string, string>;
};

type Mode = "new" | "lookup" | "edit";

type Props = {
  categories: CategoryRecord[];
  clubCodes: string[];
};

export function RegistrationPageClient({ categories, clubCodes }: Props) {
  const { t } = useLocale();
  const rf = t.registrationForm;
  const rp = rf.page;

  const newFormRef = useRef<RegistrationFormHandle>(null);
  const editFormRef = useRef<RegistrationFormHandle>(null);

  const [mode, setMode] = useState<Mode>("new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);

  const resetToNew = useCallback(() => {
    setMode("new");
    setLookupEmail("");
    setLookupError("");
    setLookupData(null);
    setIsSubmitting(false);
  }, []);

  const handleLookup = useCallback(async () => {
    const email = lookupEmail.trim();
    if (!email) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const year = new Date().getFullYear();
      const res = await fetch(
        `/api/registrations/lookup?email=${encodeURIComponent(email)}&year=${year}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupError(data.error || rp.lookupNoResult);
        return;
      }
      setLookupData(data as LookupResult);
      setMode("edit");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupEmail, rp.lookupNoResult]);

  const activeRegistrations = useMemo(
    () =>
      (lookupData?.registrations ?? []).filter(
        (r) => r.status !== "Refund Requested" && r.status !== "Cancelled"
      ),
    [lookupData]
  );

  const originalCategories = useMemo(
    () => activeRegistrations.map((r) => r.categoryId),
    [activeRegistrations]
  );

  const editInitialFormState = useMemo(() => {
    if (!lookupData) return undefined;
    const firstReg = activeRegistrations[0];
    return {
      selectedPlayerId: String(lookupData.playerId),
      fullNameEn: lookupData.fullNameEn,
      fullNameKo: lookupData.fullNameKo ?? "",
      email: lookupData.email,
      phone: lookupData.phone ?? "",
      ntrp: lookupData.ntrp ?? "",
      clubs: lookupData.clubs,
      categories: originalCategories,
      partnerNames: lookupData.partnerNames,
      photoVideoConsent: activeRegistrations.some((r) => r.photoVideoConsent),
      engravingWanted: activeRegistrations.some((r) => !!r.engraving?.trim()),
      engravingText:
        activeRegistrations.find((r) => r.engraving?.trim())?.engraving?.trim().slice(0, 25) ?? "",
      nameOnEtransfer: firstReg?.nameOnEtransfer ?? "",
      etransferSent: activeRegistrations.some((r) => /e-transfer/i.test(r.notes ?? "")),
    };
  }, [lookupData, activeRegistrations, originalCategories]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── New registration ─────────────────────────────────────────────────── */}
      {mode === "new" && (
        <>
          <p className="m-0 text-sm text-[var(--color-text-secondary)]">
            {rp.returningRegistrantPrompt}{" "}
            <button
              type="button"
              className="font-medium text-[var(--color-primary-blue-500)] underline underline-offset-2 hover:opacity-80"
              onClick={() => setMode("lookup")}
            >
              {rp.editLinkLabel}
            </button>
            {rp.editLinkSuffix ? ` ${rp.editLinkSuffix}` : ""}
          </p>

          <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-8 shadow-sm md:px-8">
            <RegistrationForm
              ref={newFormRef}
              mode="public"
              initialCategories={categories}
              initialClubCodes={clubCodes}
              onClose={resetToNew}
              onLoadingChange={setIsSubmitting}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="medium"
              onClick={() => newFormRef.current?.submit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? rf.buttons.submitting : rf.buttons.submit}
            </Button>
          </div>
        </>
      )}

      {/* ── Email lookup ──────────────────────────────────────────────────────── */}
      {mode === "lookup" && (
        <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-8 shadow-sm md:px-8">
          <div className="flex flex-col gap-6">
            <p className="m-0 text-sm text-[var(--color-text-secondary)]">
              {rp.lookupDescription}
            </p>

            <div>
              <Label htmlFor="lookup-email">{rp.lookupEmailLabel}</Label>
              <Field
                variant="email"
                id="lookup-email"
                value={lookupEmail}
                onChange={(e) => {
                  setLookupEmail(e.target.value);
                  setLookupError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleLookup();
                  }
                }}
              />
              {lookupError && (
                <p className="mt-1 text-sm text-[var(--color-status-error-text-strong)]">
                  {lookupError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="medium"
                onClick={() => void handleLookup()}
                disabled={lookupLoading || !lookupEmail.trim()}
              >
                {lookupLoading ? rf.buttons.lookingUp : rf.buttons.lookUp}
              </Button>
              <Button variant="secondary" size="medium" onClick={resetToNew}>
                {rf.buttons.back}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit registration ─────────────────────────────────────────────────── */}
      {mode === "edit" && lookupData && (
        <>
          <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-8 shadow-sm md:px-8">
            <RegistrationForm
              key={lookupData.email}
              ref={editFormRef}
              mode="publicEdit"
              initialCategories={categories}
              initialClubCodes={clubCodes}
              initialFormState={editInitialFormState}
              originalCategories={originalCategories}
              playerEmail={lookupData.email}
              year={lookupData.year}
              onClose={resetToNew}
              onLoadingChange={setIsSubmitting}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="medium"
              onClick={() => editFormRef.current?.submit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? rf.buttons.submitting : rf.buttons.saveChanges}
            </Button>
            <Button variant="secondary" size="medium" onClick={resetToNew} disabled={isSubmitting}>
              {rf.buttons.back}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
