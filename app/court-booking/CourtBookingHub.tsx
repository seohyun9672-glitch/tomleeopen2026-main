"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import { formatDateDisplay } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { Callout } from "@/app/components/ui/Callout";
import { COURT_OPTIONS } from "@/lib/content/courts";
import { addDays, getToday } from "@/lib/utils";
import type { Locale } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberInfo = { fullNameEn: string; fullNameKo: string | null };

type MatchResult = {
  id: string;
  myTeamId: string | null;
  category: { label: string; labelKo: string | null };
  team1Id: string | null;
  team2Id: string | null;
  team1: { member1: MemberInfo; member2: MemberInfo | null } | null;
  team2: { member1: MemberInfo; member2: MemberInfo | null } | null;
  courtBooking: { courtId: string; date: string } | null;
};

type CourtSlot = {
  courtId: string;
  courtName: string;
  courtNameKo: string;
  date: string;
  timeSlot: string;
  status: "Available" | "Booked";
};

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

function matchLabel(match: MatchResult, loc: Locale): string {
  const cat = displayName(match.category.label, match.category.labelKo, loc);
  const t1 = teamNames(match.team1, loc);
  const t2 = teamNames(match.team2, loc);
  return `${cat} · ${t1} vs ${t2}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourtBookingHub() {
  const { t, locale } = useLocale();
  const cb = t.courtBookingPage;
  const year = new Date().getFullYear();

  const [slots, setSlots] = useState<CourtSlot[]>([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [matchQuery, setMatchQuery] = useState("");
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

  useEffect(() => { setSelectedCourtId(""); }, [selectedDate]);

  const allCourtDates = useMemo(
    () => slotsLoaded ? new Set(slots.map((s) => s.date)) : undefined,
    [slots, slotsLoaded]
  );

  const isOutsideWindow = useMemo(() => {
    if (!selectedDate) return false;
    const today = getToday();
    const windowEnd = addDays(today, 6);
    return selectedDate < today || selectedDate > windowEnd;
  }, [selectedDate]);

  const courtsForDate = useMemo(
    () => selectedDate ? slots.filter((s) => s.date === selectedDate) : [],
    [selectedDate, slots]
  );

  const loadMatchOptions = useCallback(
    async (query: string): Promise<MatchResult[]> => {
      if (!query.trim()) return [];
      const res = await fetch(
        `/api/court-bookings?playerName=${encodeURIComponent(query)}&year=${year}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    [year]
  );

  function clearError(...keys: string[]) {
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
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
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ submit: data.error ?? cb.errors.failed });
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
    } catch {
      setErrors({ submit: cb.errors.failed });
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const court = COURT_OPTIONS.find((c) => c.id === selectedCourtId);
    const message = court
      ? `${displayName(court.name, court.nameKo, locale)} · ${formatDateDisplay(selectedDate, locale)} · ${court.timeSlot}`
      : formatDateDisplay(selectedDate, locale);
    return (
      <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
        <Callout variant="success" title={cb.confirmation.title} message={message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer contentMaxWidth="max-w-[var(--form-max-width)]">
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">{cb.description}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* 1. Date */}
        <Field
          variant="datepicker"
          id="booking-date"
          label={cb.fields.date}
          required
          value={selectedDate}
          onChange={(date) => { setSelectedDate(date); clearError("date"); }}
          enabledDates={allCourtDates}
          error={errors.date ? <p className="form-field-error">{errors.date}</p> : undefined}
        />
        {isOutsideWindow && (
          <Callout variant="warning" message={cb.fields.outsideWindow} />
        )}

        {/* 2. Court table — always visible */}
        <div className="flex flex-col gap-1.5">
          <span className="form-label">
            {cb.fields.court}
            <span className="ml-0.5 text-[var(--form-required-mark)]"> *</span>
          </span>
          <div className="rounded-lg border border-[var(--color-border-ui)] bg-white overflow-hidden min-h-[48px]">
            {courtsForDate.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
                {selectedDate ? cb.fields.noCourts : "—"}
              </p>
            ) : (
              courtsForDate.map((slot, i) => {
                const courtInfo = COURT_OPTIONS.find((c) => c.id === slot.courtId);
                const isBooked = slot.status === "Booked";
                const isSelected = selectedCourtId === slot.courtId;
                return (
                  <label
                    key={slot.courtId}
                    className={[
                      "flex items-center gap-3 px-4 py-3 select-none",
                      i > 0 ? "border-t border-[var(--color-border-ui)]" : "",
                      isBooked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--color-surface-muted)]",
                      isSelected && !isBooked ? "bg-[var(--color-surface-muted)]" : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="court"
                      value={slot.courtId}
                      checked={isSelected}
                      disabled={isBooked}
                      onChange={() => { setSelectedCourtId(slot.courtId); clearError("court"); }}
                      className="accent-[var(--color-primary-blue-500)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {displayName(slot.courtName, slot.courtNameKo, locale)}
                      </p>
                      {courtInfo && (
                        <p className="text-xs text-[var(--color-text-secondary)]">{courtInfo.timeSlot}</p>
                      )}
                    </div>
                    <Chip
                      size="sm"
                      label={isBooked ? cb.fields.courtBooked : cb.fields.courtAvailable}
                      className={isBooked ? "court-chip-booked" : "court-chip-available"}
                    />
                  </label>
                );
              })
            )}
          </div>
          {errors.court && <p className="form-field-error">{errors.court}</p>}
        </div>

        {/* 3. Match combobox — search by player name */}
        <Field
          variant="combobox"
          id="booking-match"
          label={cb.fields.match}
          required
          placeholder={cb.fields.matchPlaceholder}
          value={matchQuery}
          onValueChange={(v) => {
            setMatchQuery(v);
            if (!v.trim()) { setSelectedMatch(null); clearError("match"); }
          }}
          loadOptions={loadMatchOptions}
          onSelect={(match: MatchResult) => {
            setSelectedMatch(match);
            setMatchQuery(matchLabel(match, locale));
            clearError("match");
          }}
          getOptionKey={(m: MatchResult) => m.id}
          getOptionLabel={(m: MatchResult) => matchLabel(m, locale)}
          error={errors.match ? <p className="form-field-error">{errors.match}</p> : undefined}
        />

        {/* 4. Notes */}
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
