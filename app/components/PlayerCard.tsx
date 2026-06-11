"use client";

import { Chip } from "@/app/components/ui/Chip";
import { Divider } from "@/app/components/ui/Divider";
import { Label } from "@/app/components/ui/Label";
import { useLocale } from "@/lib/locale-context";
import { clubChipClass } from "@/lib/clubs";
import { formatNtrp } from "@/lib/utils";
import { categoryChipClass } from "@/lib/categories";
import type { PlayerRow } from "@/app/admin/AdminHub";

// ─── Icons ────────────────────────────────────────────────────────────────────

function EmailIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}


// ─── PlayerCard ───────────────────────────────────────────────────────────────

type TournamentEntry = { year: number; categoryId: string; finalist?: boolean };

type PlayerCardProps = {
  player: PlayerRow;
  tournaments: TournamentEntry[];
  onClick?: () => void;
};

export function PlayerCard({ player, tournaments, onClick }: PlayerCardProps) {
  const { locale } = useLocale();

  const displayName =
    locale === "ko"
      ? player.fullNameKo?.trim() || player.fullNameEn
      : player.fullNameEn;

  // Group by year descending
  const byYear = new Map<number, { categoryId: string; finalist: boolean }[]>();
  for (const { year, categoryId, finalist } of tournaments) {
    const cats = byYear.get(year) ?? [];
    cats.push({ categoryId, finalist: finalist ?? false });
    byYear.set(year, cats);
  }
  const yearEntries = [...byYear.entries()].sort((a, b) => b[0] - a[0]);

  const genderSymbol =
    player.gender === "F" ? "♀" : player.gender === "M" ? "♂" : null;

  const genderChipClass =
    player.gender === "F" ? "chip-gender-female" : player.gender === "M" ? "chip-gender-male" : "";

  return (
    <button
      type="button"
      className="h-full w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      onClick={onClick}
    >
      <article className="flex h-full flex-col gap-3 rounded-lg border border-[color:var(--color-border-ui)] bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Name + gender icon + NTRP */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 truncate font-semibold text-[var(--color-text-primary)]">
              {displayName}
            </span>
            {genderSymbol && (
              <Chip
                label={genderSymbol}
                size="sm"
                className={`shrink-0 border-0 ${genderChipClass}`}
                aria-label={player.gender === "F" ? "Female" : "Male"}
              />
            )}
          </div>
          {player.ntrp && (
            <Chip
              label={`NTRP ${formatNtrp(player.ntrp)}`}
              size="sm"
              className="chip-neutral border-0 shrink-0"
            />
          )}
        </div>

        {/* Email + Phone */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
          <Label icon={<EmailIcon />} value={player.email} truncate className="min-w-0" />
          <Label icon={<PhoneIcon />} value={player.phone} className="shrink-0" />
        </div>

        {/* Clubs */}
        {player.clubs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {player.clubs.map((c) => (
              <Chip key={c} label={c} size="sm" className={clubChipClass(c)} />
            ))}
          </div>
        )}

        <Divider />

        {/* Tournaments by year */}
        <div className="flex flex-col gap-2">
          {yearEntries.length === 0 ? (
            <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
          ) : (
            yearEntries.map(([year, cats]) => (
              <div key={year} className="flex flex-wrap items-center gap-1.5">
                <span className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
                  {year}:
                </span>
                {cats.map(({ categoryId, finalist }) => (
                  <Chip
                    key={categoryId}
                    label={finalist ? `👑 ${categoryId}` : categoryId}
                    size="sm"
                    className={categoryChipClass(categoryId)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </article>
    </button>
  );
}
