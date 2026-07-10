"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import { formatDateDisplay } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { BackButton } from "@/app/components/ui/BackButton";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { ChoiceCard } from "@/app/components/ui/ChoiceCard";
import { Callout } from "@/app/components/ui/Callout";
import { COURT_OPTIONS, deriveCourtBookingStatus, type CourtBookingStatus } from "@/lib/content/courts";
import { addDays, cn, getToday, getYear } from "@/lib/utils";
import type { Locale } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberInfo = { fullNameEn: string; fullNameKo: string | null };

type MatchResult = {
  id: string;
  myTeamId: string | null;
  category: { label: string; labelKo: string | null };
  round: string | null;
  matchStatus: string;
  team1Id: string | null;
  team2Id: string | null;
  team1: { member1: MemberInfo; member2: MemberInfo | null } | null;
  team2: { member1: MemberInfo; member2: MemberInfo | null } | null;
  courtBooking: { id: string; courtId: string; date: string; createdAt: string } | null;
};

type CourtSlot = {
  courtId: string;
  courtName: string;
  courtNameKo: string;
  date: string;
  timeSlot: string;
  status: CourtBookingStatus;
};

type View = "lookup" | "form";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function teamNames(
  side: { member1: MemberInfo; member2: MemberInfo | null } | null,
  loc: Locale
): string {
  if (!side) return "—";
  const m1 = displayName(side.member1.fullNameEn, side.member1.fullNameKo, loc);
  const m2 = side.member2
    ? displayName(side.member2.fullNameEn, side.member2.fullNameKo, loc)
    : null;
  return m2 ? `${m1} / ${m2}` : m1;
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourtBookingHub() {
  const { t, locale } = useLocale();
  const cb = t.courtBookingPage;
  const year = getYear();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.toString()) {
      router.replace("/court-booking", { scroll: false } as never);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>("lookup");
  const [email, setEmail] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupPlayerIds, setLookupPlayerIds] = useState<number[]>([]);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchResult[]>([]);

  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/court-bookings")
      .then((r) => r.json())
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setSlotsLoaded(true));
  }, []);

  const allCourtDates = useMemo(() => {
    if (!slotsLoaded) return undefined;
    const today = getToday();
    const bookable = slots.filter((s) => {
      if (s.date < today) return false;
      const court = COURT_OPTIONS.find((c) => c.id === s.courtId);
      const effective = deriveCourtBookingStatus(s.status, s.date, court?.timeSlot ?? "");
      return effective === "Available" || effective === "Booked";
    });
    return new Set(bookable.map((s) => s.date));
  }, [slots, slotsLoaded]);

  const isOutsideWindow = useMemo(() => {
    if (!selectedDate) return false;
    const windowEnd = addDays(getToday(), 7);
    return selectedDate > windowEnd;
  }, [selectedDate]);

  const courtsForDate = useMemo(
    () => selectedDate ? slots.filter((s) => s.date === selectedDate) : [],
    [selectedDate, slots]
  );

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function resetFormState() {
    setMatches([]);
    setSelectedDate("");
    setSelectedCourtId("");
    setSelectedMatch(null);
    setNotes("");
    setErrors({});
  }

  function goBackToLookup() {
    setEmail("");
    setLookupError(null);
    resetFormState();
    setView("lookup");
    router.replace("/court-booking", { scroll: false } as never);
  }

  // ── Email lookup → booking form ───────────────────────────────────────────────
  async function doLookup(trimmed: string) {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/registrations/lookup?email=${encodeURIComponent(trimmed)}&year=${year}`
      );
      if (res.status === 404) { setLookupError(cb.lookup.noResult); return; }
      if (!res.ok) { setLookupError(cb.lookup.error); return; }
      const data = await res.json();
      const playerIds: number[] = data.playerIds ?? (data.playerId ? [data.playerId] : []);

      const results = await Promise.all(
        playerIds.map((pid) =>
          fetch(`/api/court-bookings?playerId=${pid}&year=${year}`).then((r) => r.json())
        )
      );
      const seen = new Set<string>();
      const merged = results.flat().filter((m) => m && !seen.has(m.id) && seen.add(m.id));
      setMatches(merged);
      setLookupPlayerIds(playerIds);
      setLookupEmail(trimmed);
      setEmail("");
      setView("form");
    } catch {
      setLookupError(cb.lookup.error);
    } finally {
      setLookupLoading(false);
    }
  }

  function handleLookup() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    doLookup(trimmed);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────────
  function clearError(...keys: string[]) {
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedCourtId("");
    clearError("date", "court", "submit");
  }

  function handleCourtSelect(courtId: string) {
    setSelectedCourtId(courtId);
    clearError("court");
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedDate) errs.date = cb.errors.date;
    if (!selectedCourtId) errs.court = cb.errors.court;
    if (!selectedMatch) errs.match = cb.errors.match;
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/court-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourtId,
          date: selectedDate,
          teamId: selectedMatch!.myTeamId,
          matchId: selectedMatch!.id,
          notes: notes.trim() || undefined,
          playerIds: lookupPlayerIds,
        }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          const isWeeklyLimit = typeof body.error === "string" &&
            body.error.toLowerCase().includes("once per week");
          if (isWeeklyLimit) {
            setErrors({ submit: body.error });
          } else {
            const fresh = await fetch("/api/court-bookings").then((r) => r.json()).catch(() => []);
            if (Array.isArray(fresh)) setSlots(fresh);
            setSelectedCourtId("");
            setSelectedDate("");
            setErrors({ submit: cb.errors.slotTaken });
          }
        } else {
          setErrors({ submit: cb.errors.failed });
        }
        return;
      }
      setSlots((prev) =>
        prev.map((s) =>
          s.courtId === selectedCourtId && s.date === selectedDate
            ? { ...s, status: "Booked" as const }
            : s
        )
      );
      setConfirmed(true);
      router.replace("/court-booking", { scroll: false } as never);
    } catch {
      setErrors({ submit: cb.errors.failed });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Confirmation screen ───────────────────────────────────────────────────────
  if (confirmed) {
    const court = COURT_OPTIONS.find((c) => c.id === selectedCourtId);
    const message = court
      ? `${displayName(court.name, court.nameKo, locale)} · ${formatDateDisplay(selectedDate, locale)} · ${court.timeSlot}`
      : formatDateDisplay(selectedDate, locale);
    return (
      <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
        <div className="flex flex-col gap-4">
          <Callout variant="success" title={cb.confirmation.title} message={message} />
          <Button
            variant="secondary"
            onClick={() => router.push(`/court-booking/manage?email=${encodeURIComponent(lookupEmail)}`)}
          >
            {cb.confirmation.manageBooking}
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Lookup view ───────────────────────────────────────────────────────────────
  if (view === "lookup") {
    return (
      <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {cb.description}{" "}
          <a href={cb.chatHref} target="_blank" rel="noreferrer">
            {cb.chatLinkLabel}
          </a>
          {cb.chatLinkSuffix}{" "}
          <a href="/overview#court-booking-policy" className="text-[var(--color-primary-blue-500)]">
            {cb.cancellationPolicyLink}
          </a>
        </p>
        <div className="flex flex-col items-start gap-4">
          <Field
            variant="email"
            id="lookup-email"
            label={cb.lookup.emailLabel}
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") handleLookup(); }}
            wrapperClassName="w-full"
          />
          {lookupError && (
            <p className="text-sm text-[var(--color-status-error)]">{lookupError}</p>
          )}
          <Button
            variant="primary"
            onClick={handleLookup}
            disabled={lookupLoading || !email.trim()}
            className="w-full"
          >
            {lookupLoading ? cb.lookup.loading : cb.lookup.button}
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────────
  const unbookedMatches = (() => {
    const seen = new Set<string>();
    return matches.filter((m) => {
      if (m.courtBooking) return false;
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  })();

  return (
    <PageContainer
      beforeTitle={<BackButton onClick={goBackToLookup} />}
      contentMaxWidth="max-w-[var(--form-max-width)]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Match */}
        <div className="flex flex-col gap-1.5">
          <span className="form-label">
            {cb.fields.match}
            <span className="ml-0.5 text-[var(--form-required-mark)]"> *</span>
          </span>
          {unbookedMatches.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">{cb.lookup.noMatches}</p>
          ) : (
            <div className="rounded-lg border border-[var(--color-border-ui)] overflow-hidden">
              {unbookedMatches.map((match, i) => {
                const isSelected = selectedMatch?.id === match.id;
                const status = normalizeStatus(match.matchStatus);
                const cat = displayName(match.category.label, match.category.labelKo, locale);
                const t1 = teamNames(match.team1, locale);
                const t2 = teamNames(match.team2, locale);
                return (
                  <div key={match.id} className={i > 0 ? "border-t border-[var(--color-border-ui)]" : ""}>
                    <button
                      type="button"
                      onClick={() => { setSelectedMatch(match); clearError("match"); }}
                      className={cn(
                        "flex items-start gap-3 w-full px-4 py-3 text-left transition-colors select-none cursor-pointer hover:bg-[var(--color-surface-muted)]",
                        isSelected ? "bg-[var(--color-surface-muted)]" : "bg-[var(--color-surface-card)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected ? "border-[var(--color-primary-blue-500)]" : "border-[var(--color-border-ui-strong)]",
                        )}
                        aria-hidden
                      >
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-[var(--color-primary-blue-500)]" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{cat}</p>
                          <Chip
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            size="sm"
                            className={cn("shrink-0", `match-status-chip-${status}`)}
                          />
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">{match.round ?? "—"} · #{i + 1}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{t1} vs {t2}</p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {errors.match && <p className="form-field-error">{errors.match}</p>}
        </div>

        {/* Date */}
        <Field
          variant="datepicker"
          id="booking-date"
          label={cb.fields.date}
          required
          value={selectedDate}
          onChange={handleDateChange}
          enabledDates={allCourtDates}
          error={errors.date ? <p className="form-field-error">{errors.date}</p> : undefined}
        />
        {isOutsideWindow && (
          <Callout variant="warning" message={cb.fields.outsideWindow} />
        )}

        {/* Court — shown once date is selected */}
        {selectedDate && (
          <div className="flex flex-col gap-1.5">
            <span className="form-label">
              {cb.fields.court}
              <span className="ml-0.5 text-[var(--form-required-mark)]"> *</span>
            </span>
            {courtsForDate.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">{cb.fields.noCourts}</p>
            ) : (
              <div className="rounded-lg border border-[var(--color-border-ui)] overflow-hidden">
                {courtsForDate.map((slot, i) => {
                  const courtInfo = COURT_OPTIONS.find((c) => c.id === slot.courtId);
                  const effective = deriveCourtBookingStatus(slot.status, slot.date, courtInfo?.timeSlot ?? "");
                  const badge = {
                    Available: cb.fields.courtAvailable,
                    Booked: cb.fields.courtBooked,
                    Completed: cb.fields.courtCompleted,
                    Expired: cb.fields.courtExpired,
                  }[effective];
                  const badgeClass = `court-chip-${effective.toLowerCase()}`;
                  return (
                    <div key={slot.courtId} className={i > 0 ? "border-t border-[var(--color-border-ui)]" : ""}>
                      <ChoiceCard
                        label={displayName(slot.courtName, slot.courtNameKo, locale)}
                        sublabel={courtInfo?.timeSlot}
                        showImage={false}
                        badge={badge}
                        badgeClassName={badgeClass}
                        selected={selectedCourtId === slot.courtId}
                        disabled={effective !== "Available"}
                        onClick={() => handleCourtSelect(slot.courtId)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {errors.court && <p className="form-field-error">{errors.court}</p>}
          </div>
        )}

        {/* Notes */}
        <Field
          variant="textarea"
          id="booking-notes"
          label={cb.fields.notes}
          value={notes}
          onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
          rows={2}
        />

        {errors.submit && <p className="form-field-error">{errors.submit}</p>}

        <Button type="submit" variant="primary" disabled={submitting || isOutsideWindow}>
          {submitting ? cb.submitting : cb.submit}
        </Button>
      </form>
    </PageContainer>
  );
}
