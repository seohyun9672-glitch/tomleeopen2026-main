"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import { formatDateDisplay } from "@/lib/matches";
import { PageContainer } from "@/app/components/PageContainer";
import { BackButton } from "@/app/components/ui/BackButton";
import { Spinner } from "@/app/components/ui/Spinner";
import { COURT_OPTIONS } from "@/lib/content/courts";
import { getYear } from "@/lib/utils";
import type { Locale } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberInfo = { fullNameEn: string; fullNameKo: string | null };

type MatchResult = {
  id: string;
  category: { label: string; labelKo: string | null };
  team1: { member1: MemberInfo; member2: MemberInfo | null } | null;
  team2: { member1: MemberInfo; member2: MemberInfo | null } | null;
  courtBooking: { id: string; courtId: string; date: string; createdAt: string } | null;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ManageBookingHub({ email }: { email: string }) {
  const { t, locale } = useLocale();
  const cb = t.courtBookingPage;
  const year = getYear();
  const router = useRouter();

  const [bookings, setBookings] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/registrations/lookup?email=${encodeURIComponent(email)}&year=${year}`);
        if (!res.ok) return;
        const data = await res.json();
        const playerIds: number[] = data.playerIds ?? (data.playerId ? [data.playerId] : []);
        const results = await Promise.all(
          playerIds.map((pid) =>
            fetch(`/api/court-bookings?playerId=${pid}&year=${year}&bookings=1`).then((r) => r.json())
          )
        );
        const seen = new Set<string>();
        setBookings(results.flat().filter((m) => m && !seen.has(m.id) && seen.add(m.id)));
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [email, year]);

  return (
    <PageContainer
      title={cb.manageHeroTitle}
      beforeTitle={<BackButton onClick={() => router.push("/court-booking")} />}
      contentMaxWidth="max-w-[var(--form-max-width)]"
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">{cb.noBookingsYet}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {bookings.map((match) => {
              const booking = match.courtBooking!;
              const court = COURT_OPTIONS.find((c) => c.id === booking.courtId);
              const message = court
                ? `${displayName(court.name, court.nameKo, locale)} · ${formatDateDisplay(booking.date, locale)} · ${court.timeSlot}`
                : formatDateDisplay(booking.date, locale);
              const cat = displayName(match.category.label, match.category.labelKo, locale);
              const t1 = teamNames(match.team1, locale);
              const t2 = teamNames(match.team2, locale);
              return (
                <div key={match.id} className="rounded-lg border border-[var(--color-border-ui)] bg-[var(--color-surface-card)] px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{cat}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t1} vs {t2}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
