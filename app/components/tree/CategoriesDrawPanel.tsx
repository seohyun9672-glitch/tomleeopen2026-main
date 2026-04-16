"use client";

import { useMemo } from "react";
import { useLocale } from "@/lib/locale-context";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import type { MatchWithTeamNames } from "@/lib/matches";
import {
  buildDrawStageData,
  DRAW_STAGE_ORDER,
  knockoutSubStageFromDrawStage,
  type DrawStage,
  type DrawStageData,
} from "@/lib/drawStage";
import {
  buildTeamRankMapFromPrelims,
  teamRowsFromCategoryMatches,
  type TeamRow,
} from "@/lib/standings";
import { MatchCard } from "@/app/components/MatchCard";
import { PrelimsLeaderboardTable } from "./PrelimsLeaderboardTable";
import { TournamentTreeStageHeader } from "./StageHeader";
import { BracketView } from "./BracketView";
import { buildPrelimsLeaderboard, groupKeyFromSeed } from "@/lib/prelimsLeaderboard";

function matchSortDateKey(dateStr: string | null | undefined): string {
  const s = (dateStr ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "0000-00-00";
}

/** Letter + numeric part of seeds like "A1", "B12" for ordering prelim match cards. */
function seedTuple(seed: string | null | undefined): [string, number] {
  const s = (seed ?? "").trim();
  const m = /^([A-Za-z])(\d+)$/.exec(s);
  if (m) return [m[1]!.toUpperCase(), parseInt(m[2]!, 10)];

  const digits = /^(\d+)$/.exec(s);
  if (digits) return ["\uFFFF", parseInt(digits[1]!, 10)];

  const g = /^([A-Za-z])/.exec(s);
  return [g ? g[1]!.toUpperCase() : "\uFFFF", 9999];
}

function compareSeedTuples(a: [string, number], b: [string, number]): number {
  if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
  return a[1] - b[1];
}

function orderedSeedPair(match: MatchWithTeamNames): [[string, number], [string, number]] {
  const t1 = seedTuple(match.team1Seed);
  const t2 = seedTuple(match.team2Seed);
  return compareSeedTuples(t1, t2) <= 0 ? [t1, t2] : [t2, t1];
}

function sortPrelimMatchesForCards(matches: MatchWithTeamNames[]): MatchWithTeamNames[] {
  return [...matches].sort((a, b) => {
    const [aLow, aHigh] = orderedSeedPair(a);
    const [bLow, bHigh] = orderedSeedPair(b);

    let c = compareSeedTuples(aLow, bLow);
    if (c !== 0) return c;

    c = compareSeedTuples(aHigh, bHigh);
    if (c !== 0) return c;

    c = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
    if (c !== 0) return c;

    c = matchSortDateKey(a.date).localeCompare(matchSortDateKey(b.date));
    if (c !== 0) return c;

    c = (a.time ?? "").trim().localeCompare((b.time ?? "").trim());
    if (c !== 0) return c;

    return a.id.localeCompare(b.id);
  });
}

function drawStageOptionLabel(
  stage: DrawStage,
  hasBronze: boolean,
  tree: {
    treeFinalBronze: string;
    treeFinal: string;
    treeQuarterfinals: string;
    treeSemifinals: string;
  },
  prelims: string
): string {
  switch (stage) {
    case "prelims":
      return prelims;
    case "qf":
      return tree.treeQuarterfinals;
    case "sf":
      return tree.treeSemifinals;
    case "final":
      return hasBronze ? tree.treeFinalBronze : tree.treeFinal;
  }
}

export type CategoriesDrawPanelProps = {
  drawTeams: TeamRow[];
  categoryMatches: MatchWithTeamNames[];
  drawData?: DrawStageData;
  drawStage: DrawStage;
  setDrawStage: (stage: DrawStage) => void;
};

/** Draw tab: stage selector, then prelims or knockout bracket. */
export function CategoriesDrawPanel({
  drawTeams,
  categoryMatches,
  drawData: drawDataProp,
  drawStage,
  setDrawStage,
}: CategoriesDrawPanelProps) {
  const { t, locale } = useLocale();

  const drawData = useMemo(
    () => drawDataProp ?? buildDrawStageData(categoryMatches),
    [drawDataProp, categoryMatches]
  );

  const {
    availableStages,
    knockoutSubStages,
    isUnifiedKnockout,
    prelimMatches,
    qfMatches,
    sfMatches,
    bronzeMatches,
    finalMatches,
    finalsMatches,
  } = drawData;

  const [selectedGroup, setSelectedGroup] = useUrlParam("group");

  const teamRowsForRank = useMemo(
    () => (drawTeams.length > 0 ? drawTeams : teamRowsFromCategoryMatches(categoryMatches)),
    [drawTeams, categoryMatches]
  );

  const teamRankById = useMemo(
    () => buildTeamRankMapFromPrelims(teamRowsForRank, prelimMatches),
    [teamRowsForRank, prelimMatches]
  );

  const bracketTeamRankById = useMemo(
    () => (isUnifiedKnockout ? new Map<string, number>() : teamRankById),
    [isUnifiedKnockout, teamRankById]
  );

  const prelimsBoard = useMemo(() => buildPrelimsLeaderboard(categoryMatches), [categoryMatches]);
  const boardGroups = prelimsBoard?.groups ?? [];

  const resolvedGroup =
    boardGroups.length <= 1
      ? (boardGroups[0] ?? "")
      : boardGroups.includes(selectedGroup)
        ? selectedGroup
        : (boardGroups[0] ?? "");

  const boardRows = resolvedGroup ? prelimsBoard?.rowsByGroup[resolvedGroup] ?? [] : [];

  const prelimMatchesForSeed = useMemo(
    () =>
      sortPrelimMatchesForCards(
        prelimMatches.filter((match) => {
          if (!resolvedGroup || resolvedGroup === "All") return true;
          const g1 = groupKeyFromSeed(match.team1Seed);
          const g2 = groupKeyFromSeed(match.team2Seed);
          return g1 === resolvedGroup || g2 === resolvedGroup;
        })
      ),
    [prelimMatches, resolvedGroup]
  );

  const hasBronze = bronzeMatches.length > 0;

  const activeKnockoutColumn = useMemo(() => {
    const sub = knockoutSubStageFromDrawStage(drawStage);

    if (sub && knockoutSubStages.includes(sub)) {
      const hasData =
        (sub === "qf" && qfMatches.length > 0) ||
        (sub === "sf" && sfMatches.length > 0) ||
        (sub === "final" && (finalMatches.length > 0 || bronzeMatches.length > 0));

      if (hasData) return sub;
    }

    return knockoutSubStages[0] ?? "qf";
  }, [
    bronzeMatches.length,
    drawStage,
    finalMatches.length,
    knockoutSubStages,
    qfMatches.length,
    sfMatches.length,
  ]);

  const drawHasAnyData =
    availableStages.length > 0 ||
    finalsMatches.length > 0 ||
    prelimMatches.length > 0 ||
    prelimsBoard != null;

  const orderedDrawStages = useMemo(
    () => DRAW_STAGE_ORDER.filter((stage) => availableStages.includes(stage)),
    [availableStages]
  );

  const showDrawStageNav = drawHasAnyData && orderedDrawStages.length > 1;
  const stageNavIndex = orderedDrawStages.indexOf(drawStage);
  const mobilePrevStage = stageNavIndex > 0 ? orderedDrawStages[stageNavIndex - 1]! : null;
  const mobileNextStage =
    stageNavIndex >= 0 && stageNavIndex < orderedDrawStages.length - 1
      ? orderedDrawStages[stageNavIndex + 1]!
      : null;

  return (
    <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)] text-[var(--section-text)]">
      {showDrawStageNav ? (
        <div className="md:hidden">
          <TournamentTreeStageHeader
            title={drawStageOptionLabel(drawStage, hasBronze, t.matchUi, t.matchUi.roundPreliminaries)}
            navigation={{
              onPrev: () => { if (mobilePrevStage) setDrawStage(mobilePrevStage); },
              onNext: () => { if (mobileNextStage) setDrawStage(mobileNextStage); },
              prevDisabled: mobilePrevStage == null,
              nextDisabled: mobileNextStage == null,
              prevLabel: t.drawsPage.bracketPrevRound,
              nextLabel: t.drawsPage.bracketNextRound,
            }}
          />
        </div>
      ) : null}

      {drawStage === "prelims" && !isUnifiedKnockout ? (
        <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
          {boardGroups.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[color:var(--foreground)]">
                {locale === "ko" ? "조" : "Group"}
              </span>
              <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[color:var(--outline-blue-subtle)] bg-[var(--color-surface-muted)] p-1">
                {boardGroups.map((group) => {
                  const active = resolvedGroup === group;
                  const label = group === "All" ? t.drawsPage.prelims.allGroups : group;

                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className={`max-w-max shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-center text-xs font-medium transition-colors ${
                        active
                          ? "border border-[color:var(--outline-blue-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-sm"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {prelimsBoard && boardRows.length > 0 ? (
            <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
              <PrelimsLeaderboardTable
                rankHeader={t.drawsPage.prelims.tableRank}
                playersHeader={t.drawsPage.prelims.tablePlayers}
                wHeader={t.drawsPage.prelims.tableW}
                lHeader={t.drawsPage.prelims.tableL}
                sdHeader={t.drawsPage.prelims.tableSD}
                gdHeader={t.drawsPage.prelims.tableGD}
                rows={boardRows}
              />

              {locale !== "ko" ? (
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]">
                  {[
                    `${t.drawsPage.prelims.tableW} - Wins`,
                    `${t.drawsPage.prelims.tableL} - Losses`,
                    `${t.drawsPage.prelims.tableSD} - Set difference`,
                    `${t.drawsPage.prelims.tableGD} - Game difference`,
                  ].map((item) => (
                    <li key={item} className="flex items-center before:mr-2 before:content-['•']">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
            {prelimMatchesForSeed.length === 0 ? (
              <p className="text-[var(--color-text-tertiary)] text-sm">{t.drawsPage.prelims.noPrelimsMatches}</p>
            ) : (
              <ul className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
                {prelimMatchesForSeed.map((match) => (
                  <li key={match.id}>
                    <MatchCard match={match} omitCategoryInHeader />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {drawStage !== "prelims" ? (
        <>
          {finalsMatches.length === 0 ? (
            <p className="text-[var(--color-text-tertiary)] text-sm">{t.drawsPage.drawNoMatches}</p>
          ) : knockoutSubStages.length === 0 ? (
            <p className="text-[var(--color-text-tertiary)] text-sm">{t.drawsPage.drawNoMatches}</p>
          ) : (
            <BracketView
              r16Matches={isUnifiedKnockout ? prelimMatches : undefined}
              qfMatches={qfMatches}
              sfMatches={sfMatches}
              bronzeMatches={bronzeMatches}
              finalMatches={finalMatches}
              teamRankById={bracketTeamRankById}
              activeKnockoutColumn={activeKnockoutColumn}
              suppressMobileRoundTitle={showDrawStageNav}
            />
          )}
        </>
      ) : null}

      {!drawHasAnyData ? (
        <p className="text-[var(--color-text-tertiary)] text-sm">{t.drawsPage.drawNoMatches}</p>
      ) : null}
    </div>
  );
}
