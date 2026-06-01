"use client";

import { useState } from "react";
import { PageContainer } from "@/app/components/PageContainer";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { RegistrationForm } from "@/app/registration/RegistrationForm";
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

type Props = { categories: CategoryRecord[] };

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

// ─── RegistrationManageHub ────────────────────────────────────────────────────

export function RegistrationManageHub({ categories }: Props) {
  const { t, locale } = useLocale();
  const rp = t.registrationPage;
  const year = new Date().getFullYear();

  const [view, setView] = useState<View>("lookup");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // ─── Lookup ───────────────────────────────────────────────────────────────

  async function handleLookup() {
    const email = lookupEmail.trim().toLowerCase();
    if (!email) return;
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
    } catch {
      setLookupError(rp.lookupError);
    } finally {
      setLookupLoading(false);
    }
  }

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
    const activeRegs = lookupResult.registrations.filter(
      (r) => r.status !== "Cancelled"
    );
    return (
      <PageContainer title={rp.manageHeroTitle} contentMaxWidth="max-w-[var(--form-max-width)]">
        <div className="flex w-full flex-col gap-4">
          <RegistrationForm
            categories={categories}
            year={year}
            player={{
              fullNameEn: lookupResult.fullNameEn,
              fullNameKo: lookupResult.fullNameKo ?? "",
              email: lookupResult.email,
              phone: lookupResult.phone ?? "",
              ntrp: lookupResult.ntrp ?? "",
              clubs: lookupResult.clubs,
              playerId: lookupResult.playerId,
            }}
            categoryIds={activeRegs.map((r) => r.categoryId)}
            partnerNames={lookupResult.partnerNames}
            nameOnEtransfer={activeRegs[0]?.nameOnEtransfer ?? ""}
            notes={activeRegs[0]?.notes ?? ""}
            etransferSent
            mediaConsent={activeRegs[0]?.photoVideoConsent ?? false}
            isEdit
            onSuccess={async () => {
              await refreshLookup();
              setView("result");
            }}
            onCancel={() => setView("result")}
          />
        </div>
      </PageContainer>
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
          <Button variant="secondary" onClick={() => setView("edit")}>
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
        <Button onClick={handleLookup} disabled={lookupLoading || !lookupEmail.trim()}>
          {lookupLoading ? rp.lookingUpButton : rp.lookupButton}
        </Button>
      </div>
    </PageContainer>
  );
}
