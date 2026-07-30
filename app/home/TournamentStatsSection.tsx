"use client";

import { useLocale } from "@/lib/locale-context";

type TournamentStatsProps = {
  categories: number;
  competingPlayers: number;
  teams: number;
  totalMatches: number;
  prizePool: number;
  daysToFinal: number;
};

export function TournamentStatsSection(props: TournamentStatsProps) {
  const { t } = useLocale();
  const labels = t.homePage.tournamentStats;

  const stats = [
    { label: labels.categories,       value: props.categories || "—" },
    { label: labels.competingPlayers, value: props.competingPlayers || "—" },
    { label: labels.teams,            value: props.teams || "—" },
    { label: labels.totalMatches,     value: props.totalMatches || "—" },
    { label: labels.prizePool,        value: props.prizePool ? `$${props.prizePool.toLocaleString()}` : "—" },
    { label: labels.daysToFinal,      value: `D-${props.daysToFinal}` },
  ];

  return (
    <div className="w-full border-y border-[var(--color-border-ui)] bg-[var(--color-surface-card)]">
      <div className="w-full py-0">
        <div className="grid grid-cols-1 xs:grid-cols-2 ms:grid-cols-3 md:grid-cols-6 gap-px bg-[var(--color-border-ui)]">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="md:aspect-square flex flex-col justify-between gap-2 px-[var(--content-gap)] py-6 md:py-[var(--content-gap)] items-center text-center bg-[var(--color-surface-card)]"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                {label}
              </span>
              <span className="font-[family-name:var(--font-heading)] text-[clamp(2rem,6vw,4rem)] font-black leading-none text-[var(--color-primary-blue-900)]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
