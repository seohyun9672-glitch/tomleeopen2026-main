"use client";

import { useMemo } from "react";

import { MatchCard } from "@/app/components/MatchCard";
import { useUrlParam } from "@/lib/hooks/useUrlParam";
import { useLocale } from "@/lib/locale-context";
import { buildPrelimsLeaderboard, groupKeyFromSeed } from "@/lib/prelimsLeaderboard";
import {
  DRAW_STAGE_ORDER,
  knockoutSubStageFromDrawStage,
  type DrawStage,
  type DrawStageData,
} from "@/lib/draws";
import type { MatchWithTeamNames } from "@/lib/matches";
import {
  buildTeamRankMapFromPrelims,
  teamRowsFromCategoryMatches,
} from "@/lib/matches";

import { BracketView } from "./BracketView";
import { PrelimsLeaderboardTable } from "./PrelimsLeaderboardTable";
import { StageHeader } from "./StageHeader";

function matchSortDateKey(dateStr: string | null | undefined): string {
  const value = (dateStr ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "0000-00-00";
}

function seedTuple(seed: string | null | undefined): [string, number] {
  const value = (seed ?? "").trim();

  const alphaNumeric = /^([A-Za-z])(\d+)$/.exec(value);
  if (alphaNumeric) {
    return [alphaNumeric[1]!.toUpperCase(), parseInt(alphaNumeric[2]!, 10)];
  }

  const numeric = /^(\d+)$/.exec(value);
  if (numeric) {
    return ["\uFFFF", parseInt(numeric[1]!, 10)];
  }

  const alpha = /^([A-Za-z])/.exec(value);
  return [alpha ? alpha[1]!.toUpperCase() : "\uFFFF", 9999];
}

function compareSeedTuples(a: [string, number], b: [string, number]): number {
  if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
  return a[1] - b[1];
}

function orderedSeedPair(match: MatchWithTeamNames): [[string, number], [string, number]] {
  const team1 = seedTuple(match.team1Seed);
  const team2 = seedTuple(match.team2Seed);
  return compareSeedTuples(team1, team2) <= 0 ? [team1, team2] : [team2, team1];
}

function sortPrelimMatchesForCards(matches: MatchWithTeamNames[]): MatchWithTeamNames[] {
  return [...matches].sort((a, b) => {
    const [aLow, aHigh] = orderedSeedPair(a);
    const [bLow, bHigh] = orderedSeedPair(b);

    let comparison = compareSeedTuples(aLow, bLow);
    if (comparison !== 0) return comparison;

    comparison = compareSeedTuples(aHigh, bHigh);
    if (comparison !== 0) return comparison;

    comparison = (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
    if (comparison !== 0) return comparison;

    comparison = matchSortDateKey(a.date).localeCompare(matchSortDateKey(b.date));
    if (comparison !== 0) return comparison;

    comparison = (a.time ?? "").trim().localeCompare((b.time ?? "").trim());
    if (comparison !== 0) return comparison;

    return a.id.localeCompare(b.id);
  });
}

function getStageMatches(
  stage: DrawStage,
  matchesByStage: Record<"prelims" | "qf" | "sf" | "final", MatchWithTeamNames[]>,
): MatchWithTeamNames[] {
  return matchesByStage[stage] ?? [];
}

function getStageTitle(
  stage: DrawStage,
  locale: "en" | "ko",
  matchesByStage: Record<"prelims" | "qf" | "sf" | "final", MatchWithTeamNames[]>,
): string {
  const round = getStageMatches(stage, matchesByStage)[0]?.round;
  if (!round) return "";
  return locale === "ko" ? round.labelKo : round.labelEn;
}

function getResolvedGroup(boardGroups: string[], selectedGroup: string): string {
  if (boardGroups.length <= 1) return boardGroups[0] ?? "";
  if (boardGroups.includes(selectedGroup)) return selectedGroup;
  return boardGroups[0] ?? "";
}

function getPrelimLegendItems(t: ReturnType<typeof useLocale>["t"]): string[] {
  return [
    `${t.drawsPage.prelims.tableW} - Wins`,
    `${t.drawsPage.prelims.tableL} - Losses`,
    `${t.drawsPage.prelims.tableSD} - Set difference`,
    `${t.drawsPage.prelims.tableGD} - Game difference`,
  ];
}

export type CategoriesDrawPanelProps = {
  categoryMatches: MatchWithTeamNames[];
  drawData: DrawStageData;
  drawStage: DrawStage;
  setDrawStage: (stage: DrawStage) => void;
};

export function CategoriesDrawPanel({
  categoryMatches,
  drawData,
  drawStage,
  setDrawStage,
}: CategoriesDrawPanelProps) {
  const { t, locale } = useLocale();
  const [selectedGroup, setSelectedGroup] = useUrlParam("group");

  const {
    availableStages,
    knockoutSubStages,
    isUnifiedKnockout,
    r16Matches,
    prelimMatches,
    qfMatches,
    sfMatches,
    finalMatches,
    finalsMatches,
  } = drawData;

  const matchesByStage = useMemo(
    () => ({
      prelims: prelimMatches,
      qf: qfMatches,
      sf: sfMatches,
      final: finalMatches,
    }),
    [prelimMatches, qfMatches, sfMatches, finalMatches],
  );

  const teamRankById = useMemo(
    () => buildTeamRankMapFromPrelims(teamRowsFromCategoryMatches(categoryMatches), prelimMatches),
    [categoryMatches, prelimMatches],
  );

  const bracketTeamRankById = useMemo(
    () => (isUnifiedKnockout ? new Map<string, number>() : teamRankById),
    [isUnifiedKnockout, teamRankById],
  );

  const prelimsBoard = useMemo(
    () => buildPrelimsLeaderboard(categoryMatches),
    [categoryMatches],
  );

  const boardGroups = prelimsBoard?.groups ?? [];

  const resolvedGroup = useMemo(
    () => getResolvedGroup(boardGroups, selectedGroup),
    [boardGroups, selectedGroup],
  );

  const boardRows = resolvedGroup
    ? prelimsBoard?.rowsByGroup[resolvedGroup] ?? []
    : [];

  const prelimMatchesForSeed = useMemo(() => {
    const filtered = prelimMatches.filter((match) => {
      if (!resolvedGroup || resolvedGroup === "All") return true;
      const group1 = groupKeyFromSeed(match.team1Seed);
      const group2 = groupKeyFromSeed(match.team2Seed);
      return group1 === resolvedGroup || group2 === resolvedGroup;
    });

    return sortPrelimMatchesForCards(filtered);
  }, [prelimMatches, resolvedGroup]);

  const activeKnockoutColumn = useMemo(() => {
    const subStage = knockoutSubStageFromDrawStage(drawStage);

    if (subStage && knockoutSubStages.includes(subStage)) {
      const hasMatches =
        (subStage === "qf" && qfMatches.length > 0) ||
        (subStage === "sf" && sfMatches.length > 0) ||
        (subStage === "final" && finalMatches.length > 0);

      if (hasMatches) return subStage;
    }

    return knockoutSubStages[0] ?? "qf";
  }, [drawStage, knockoutSubStages, qfMatches.length, sfMatches.length, finalMatches.length]);

  const drawHasAnyData =
    availableStages.length > 0 ||
    finalsMatches.length > 0 ||
    prelimMatches.length > 0 ||
    prelimsBoard != null;

  const orderedDrawStages = useMemo(
    () => DRAW_STAGE_ORDER.filter((stage) => availableStages.includes(stage)),
    [availableStages],
  );

  const showDrawStageNav = drawHasAnyData && orderedDrawStages.length > 1;
  const stageNavIndex = orderedDrawStages.indexOf(drawStage);

  const mobilePrevStage = stageNavIndex > 0 ? orderedDrawStages[stageNavIndex - 1] : null;
  const mobileNextStage =
    stageNavIndex >= 0 && stageNavIndex < orderedDrawStages.length - 1
      ? orderedDrawStages[stageNavIndex + 1]
      : null;

  const showPrelimsSection = drawStage === "prelims" && !isUnifiedKnockout;
  const showKnockoutSection = drawStage !== "prelims" || isUnifiedKnockout;

  const stageTitle = getStageTitle(drawStage, locale, matchesByStage);
  const prelimLegendItems = getPrelimLegendItems(t);

  return (
    <div className="space-y-[var(--content-gap)] text-[var(--section-text)] md:space-y-[var(--section-gap)]">
      {showDrawStageNav && (
        <div className="md:hidden">
          <StageHeader
            title={stageTitle}
            navigation={{
              onPrev: () => {
                if (mobilePrevStage) setDrawStage(mobilePrevStage);
              },
              onNext: () => {
                if (mobileNextStage) setDrawStage(mobileNextStage);
              },
              prevDisabled: mobilePrevStage == null,
              nextDisabled: mobileNextStage == null,
              prevLabel: t.drawsPage.bracketPrevRound,
              nextLabel: t.drawsPage.bracketNextRound,
            }}
          />
        </div>
      )}

      {showPrelimsSection && (
        <div className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
          {boardGroups.length > 1 && (
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
          )}

          {prelimsBoard && boardRows.length > 0 && (
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

              {locale !== "ko" && (
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]">
                  {prelimLegendItems.map((item) => (
                    <li key={item} className="flex items-center before:mr-2 before:content-['•']">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-[var(--element-gap)] md:space-y-[var(--content-gap)]">
            {prelimMatchesForSeed.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {t.drawsPage.prelims.noPrelimsMatches}
              </p>
            ) : (
              <ul className="space-y-[var(--content-gap)] md:space-y-[var(--section-gap)]">
                {prelimMatchesForSeed.map((match) => (
                  <li key={match.id}>
                    <MatchCard
                      match={match}
                      omitCategoryInHeader
                      team1Rank={match.team1Id ? (teamRankById.get(match.team1Id) ?? null) : null}
                      team2Rank={match.team2Id ? (teamRankById.get(match.team2Id) ?? null) : null}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showKnockoutSection && (
        <>
          {knockoutSubStages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              {t.drawsPage.drawNoMatches}
            </p>
          ) : (
            <BracketView
              r16Matches={isUnifiedKnockout ? (r16Matches.length > 0 ? r16Matches : prelimMatches) : undefined}
              qfMatches={qfMatches}
              sfMatches={sfMatches}
              finalMatches={finalMatches}
              teamRankById={bracketTeamRankById}
              activeKnockoutColumn={activeKnockoutColumn}
              suppressMobileRoundTitle={showDrawStageNav}
            />
          )}
        </>
      )}
    </div>
  );
}