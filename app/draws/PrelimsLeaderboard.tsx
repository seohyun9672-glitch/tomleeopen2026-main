"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/locale-context";
import type { MatchWithTeamNames } from "@/lib/matches";
import { ROUND_PRE } from "@/lib/round";
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

function parseSetValues(m: MatchWithTeamNames): Array<[number, number]> {
  const sets: Array<[string | null, string | null]> = [
    [m.set1ScoreTeam1, m.set1ScoreTeam2],
    [m.set2ScoreTeam1, m.set2ScoreTeam2],
    [m.set3ScoreTeam1, m.set3ScoreTeam2],
  ];
  const out: Array<[number, number]> = [];
  for (const [a, b] of sets) {
    const n1 = a != null ? parseInt(a, 10) : NaN;
    const n2 = b != null ? parseInt(b, 10) : NaN;
    if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
    out.push([n1, n2]);
  }
  return out;
}

function buildLeaderboard(categoryMatches: MatchWithTeamNames[]): LeaderboardRow[] | null {
  const prelims = categoryMatches.filter((m) => m.round?.code === ROUND_PRE);
  if (prelims.length === 0) return null;

  const stats = new Map<
    string,
    {
      teamId: string; seed: string; player1: string; player2?: string;
      player1Ko?: string; player2Ko?: string;
      w: number; l: number; sd: number; gd: number;
    }
  >();

  function ensure(teamId: string | null, seed: string | null, player: string | null, playerKo: string | null) {
    if (!teamId) return;
    const name = (player ?? "—").trim() || "—";
    const names = name.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
    const koRaw = (playerKo ?? "").trim();
    const namesKo = koRaw ? koRaw.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean) : [];
    if (!stats.has(teamId)) {
      stats.set(teamId, {
        teamId, seed: (seed ?? "—").trim() || "—",
        player1: names[0] ?? "—", player2: names[1],
        player1Ko: namesKo[0], player2Ko: namesKo[1],
        w: 0, l: 0, sd: 0, gd: 0,
      });
    } else {
      const row = stats.get(teamId)!;
      if (!row.player1Ko && namesKo[0]) row.player1Ko = namesKo[0];
      if (!row.player2Ko && namesKo[1]) row.player2Ko = namesKo[1];
    }
  }

  for (const m of prelims) {
    ensure(m.team1Id, m.team1Seed, m.team1DisplayName, m.team1DisplayNameKo);
    ensure(m.team2Id, m.team2Seed, m.team2DisplayName, m.team2DisplayNameKo);
    if (m.winner == null || !m.team1Id || !m.team2Id) continue;
    const t1 = stats.get(m.team1Id);
    const t2 = stats.get(m.team2Id);
    if (!t1 || !t2) continue;
    if (m.winner === 1) { t1.w += 1; t2.l += 1; } else { t2.w += 1; t1.l += 1; }
    for (const [g1, g2] of parseSetValues(m)) {
      t1.gd += g1 - g2; t2.gd += g2 - g1;
      if (g1 > g2) { t1.sd += 1; t2.sd -= 1; } else if (g2 > g1) { t2.sd += 1; t1.sd -= 1; }
    }
  }

  const allRows = [...stats.values()];
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
  if (numeric) return ["\uFFFF", parseInt(numeric[1]!, 10)];
  const alpha = /^([A-Za-z])/.exec(value);
  return [alpha ? alpha[1]!.toUpperCase() : "\uFFFF", 9999];
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

  // Leaderboard rows filtered to the selected group and re-ranked within it.
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
