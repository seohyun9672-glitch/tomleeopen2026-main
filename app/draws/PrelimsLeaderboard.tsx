"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/locale-context";
import type { MatchWithTeamNames } from "@/lib/matches";
import { ROUND_PRE } from "@/lib/round";
import { computePrelimStats } from "@/lib/draws";
import { MatchCard } from "@/app/components/MatchCard";
import { Table } from "@/app/components/ui/table/Table";

// ─── Data computation ─────────────────────────────────────────────────────────

type LeaderboardRow = {
  rank: number;
  seed: string;
  player1: string;
  player2?: string;
  player1Ko?: string;
  player2Ko?: string;
  w: number;
  l: number;
  sd: number;
  gd: number;
  teamId: string;
};

type DisplayInfo = {
  seed: string;
  player1: string;
  player2?: string;
  player1Ko?: string;
  player2Ko?: string;
};

function buildDisplayMap(prelims: MatchWithTeamNames[]): Map<string, DisplayInfo> {
  const map = new Map<string, DisplayInfo>();
  for (const m of prelims) {
    const teams: Array<[string | null, string | null, string | null, string | null]> = [
      [m.team1Id, m.team1Seed, m.team1DisplayName, m.team1DisplayNameKo],
      [m.team2Id, m.team2Seed, m.team2DisplayName, m.team2DisplayNameKo],
    ];
    for (const [teamId, seed, name, nameKo] of teams) {
      if (!teamId) continue;
      const names = (name ?? "—").trim().split(/\s*\/\s*/).filter(Boolean);
      const namesKo = (nameKo ?? "").trim() ? (nameKo ?? "").split(/\s*\/\s*/).filter(Boolean) : [];
      if (!map.has(teamId)) {
        map.set(teamId, {
          seed: (seed ?? "—").trim() || "—",
          player1: names[0] ?? "—",
          player2: names[1],
          player1Ko: namesKo[0],
          player2Ko: namesKo[1],
        });
      } else {
        const info = map.get(teamId)!;
        if (!info.player1Ko && namesKo[0]) info.player1Ko = namesKo[0];
        if (!info.player2Ko && namesKo[1]) info.player2Ko = namesKo[1];
      }
    }
  }
  return map;
}

function buildLeaderboard(categoryMatches: MatchWithTeamNames[]): LeaderboardRow[] | null {
  const prelims = categoryMatches.filter((m) => m.round?.code === ROUND_PRE);
  if (prelims.length === 0) return null;

  const statsMap = computePrelimStats(categoryMatches);
  if (statsMap.size < 2) return null;

  const displayMap = buildDisplayMap(prelims);

  const allRows = [...statsMap.keys()]
    .filter((id) => displayMap.has(id))
    .map((teamId) => ({ teamId, rank: 0, ...displayMap.get(teamId)!, ...statsMap.get(teamId)! }));

  if (allRows.length < 2) return null;

  const sorted = [...allRows].sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w;
    if (b.sd !== a.sd) return b.sd - a.sd;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return a.seed.localeCompare(b.seed) || a.player1.localeCompare(b.player1);
  });

  let currentRank = 0;
  let prev: { w: number; sd: number; gd: number } | null = null;
  return sorted.map((row, i) => {
    if (!prev || row.w !== prev.w || row.sd !== prev.sd || row.gd !== prev.gd) {
      currentRank = i + 1;
      prev = { w: row.w, sd: row.sd, gd: row.gd };
    }
    return { ...row, rank: currentRank };
  });
}

// ─── Match sorting ────────────────────────────────────────────────────────────

function seedTuple(seed: string | null | undefined): [string, number] {
  const value = (seed ?? "").trim();
  const alphaNumeric = /^([A-Za-z])(\d+)$/.exec(value);
  if (alphaNumeric) return [alphaNumeric[1]!.toUpperCase(), parseInt(alphaNumeric[2]!, 10)];
  const numeric = /^(\d+)$/.exec(value);
  if (numeric) return ["￿", parseInt(numeric[1]!, 10)];
  const alpha = /^([A-Za-z])/.exec(value);
  return [alpha ? alpha[1]!.toUpperCase() : "￿", 9999];
}

function cmpSeeds(a: [string, number], b: [string, number]): number {
  return a[0] !== b[0] ? a[0].localeCompare(b[0]) : a[1] - b[1];
}

function sortPrelimMatches(matches: MatchWithTeamNames[]): MatchWithTeamNames[] {
  return [...matches].sort((a, b) => {
    const t1a = seedTuple(a.team1Seed); const t2a = seedTuple(a.team2Seed);
    const t1b = seedTuple(b.team1Seed); const t2b = seedTuple(b.team2Seed);
    const [aLow, aHigh] = cmpSeeds(t1a, t2a) <= 0 ? [t1a, t2a] : [t2a, t1a];
    const [bLow, bHigh] = cmpSeeds(t1b, t2b) <= 0 ? [t1b, t2b] : [t2b, t1b];
    return cmpSeeds(aLow, bLow) || cmpSeeds(aHigh, bHigh)
      || (a.matchNumber ?? 0) - (b.matchNumber ?? 0)
      || (/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? "") ? a.date! : "0000").localeCompare(/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "") ? b.date! : "0000")
      || (a.time ?? "").localeCompare(b.time ?? "")
      || a.id.localeCompare(b.id);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  categoryMatches: MatchWithTeamNames[];
  selectedGroup: string;
};

export function PrelimsLeaderboard({ categoryMatches, selectedGroup }: Props) {
  const { locale, t } = useLocale();

  const allRows = useMemo(() => buildLeaderboard(categoryMatches), [categoryMatches]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!allRows) return map;
    for (const row of allRows) map.set(row.teamId, row.rank);
    return map;
  }, [allRows]);

  const rows = useMemo(() => {
    if (!allRows) return null;
    const filtered = selectedGroup
      ? allRows.filter((r) => r.seed === selectedGroup)
      : allRows;
    let rank = 0;
    let prev: { w: number; sd: number; gd: number } | null = null;
    return filtered.map((r, i) => {
      if (!prev || r.w !== prev.w || r.sd !== prev.sd || r.gd !== prev.gd) {
        rank = i + 1;
        prev = { w: r.w, sd: r.sd, gd: r.gd };
      }
      return { ...r, rank };
    });
  }, [allRows, selectedGroup]);

  const prelimMatchesFiltered = useMemo(() => {
    const prelims = categoryMatches.filter((m) => m.round?.code === ROUND_PRE);
    const filtered = selectedGroup
      ? prelims.filter((m) =>
          m.team1Seed?.trim() === selectedGroup ||
          m.team2Seed?.trim() === selectedGroup
        )
      : prelims;
    return sortPrelimMatches(filtered);
  }, [categoryMatches, selectedGroup]);

  if (!rows && prelimMatchesFiltered.length === 0) return null;

  const headers = [
    t.drawsPage.prelims.tableRank,
    t.drawsPage.prelims.tablePlayers,
    t.drawsPage.prelims.tableW,
    t.drawsPage.prelims.tableL,
    t.drawsPage.prelims.tableSD,
    t.drawsPage.prelims.tableGD,
  ];

  const dataRows = (rows ?? []).map((r) => {
    const p1 = locale === "ko" ? (r.player1Ko ?? r.player1) : r.player1;
    const p2 = r.player2 ? (locale === "ko" ? (r.player2Ko ?? r.player2) : r.player2) : undefined;
    const playerCell = p2 ? (
      <span key={r.teamId} className="flex flex-col gap-0.5">
        <span>{p1}</span>
        <span>{p2}</span>
      </span>
    ) : p1;
    return [r.rank, playerCell, r.w, r.l, r.sd, r.gd];
  });

  const legendItems = [
    `${t.drawsPage.prelims.tableW} - Wins`,
    `${t.drawsPage.prelims.tableL} - Losses`,
    `${t.drawsPage.prelims.tableSD} - Set difference`,
    `${t.drawsPage.prelims.tableGD} - Game difference`,
  ];

  return (
    <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
      {rows && rows.length > 0 && (
        <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
          <Table
            variant="data"
            headers={headers}
            dataRows={dataRows}
            columnNoWrap={[true, true, true, true, true, true]}
          />
          {locale !== "ko" && (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]">
              {legendItems.map((item) => (
                <li key={item} className="flex items-center before:mr-2 before:content-['•']">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
        {prelimMatchesFiltered.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {t.drawsPage.prelims.noPrelimsMatches}
          </p>
        ) : (
          <ul className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
            {prelimMatchesFiltered.map((match) => (
              <li key={match.id}>
                <MatchCard
                  match={match}
                  omitCategoryInHeader
                  team1Rank={match.team1Id ? (rankMap.get(match.team1Id) ?? null) : null}
                  team2Rank={match.team2Id ? (rankMap.get(match.team2Id) ?? null) : null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
