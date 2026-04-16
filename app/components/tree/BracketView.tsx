"use client";

import type { ReactNode } from "react";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { MatchWithTeamNames } from "@/lib/matches";
import type { KnockoutSubStage } from "@/lib/drawStage";

import { MatchCard } from "@/app/components/MatchCard";
import { TournamentTreeStageHeader } from "./StageHeader";
import { useLocale } from "@/lib/locale-context";
import { resolveBracketTeamDisplayRank } from "@/lib/standings";

type BracketViewProps = {
  /** First knockout column when `PRE` is structurally Round of 16 (pooled or single bracket). */
  r16Matches?: MatchWithTeamNames[];
  qfMatches: MatchWithTeamNames[];
  sfMatches: MatchWithTeamNames[];
  bronzeMatches?: MatchWithTeamNames[];
  finalMatches: MatchWithTeamNames[];
  /** Prelim-based category rank (1 = best); omit for unified knockout trees (no seed pills from RR). */
  teamRankById: Map<string, number>;
  /** Mobile (< md): visible knockout column when not using unified horizontal scroll. */
  activeKnockoutColumn: KnockoutSubStage;
  /**
   * Mobile pager only: parent already shows the active stage title — omit duplicate
   * `TournamentTreeStageHeader` above the bracket stack.
   */
  suppressMobileRoundTitle?: boolean;
  /** Desktop only: optional control rendered above the bracket (e.g. prelims/knockout toggle). */
  desktopStageControl?: ReactNode;
};

/** Connector column fixed width; match columns flex equally and share row width (see `columnFlexClass`). */
const CONNECTOR_WIDTH = 40;
/** Fallback / minimum slot height until cards are measured. */
const SLOT_HEIGHT = 220;
const SLOT_GAP = 20;
/** Fallback spacer when stack offset has not been measured yet. */
const HEADER_BAND_FALLBACK = 54;

type RoundKey = "r16" | "qf" | "sf" | "final";

type RoundGeom = { centers: number[]; height: number };

type BracketStep = { key: RoundKey; matches: MatchWithTeamNames[] };

function sortByMatchNumber(matches: MatchWithTeamNames[]): MatchWithTeamNames[] {
  return [...matches].sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0) || a.id.localeCompare(b.id));
}

function buildSteps(
  r16: MatchWithTeamNames[],
  qf: MatchWithTeamNames[],
  sf: MatchWithTeamNames[],
  finalCol: MatchWithTeamNames[]
): BracketStep[] {
  const steps: BracketStep[] = [];
  if (r16.length) steps.push({ key: "r16", matches: r16 });
  if (qf.length) steps.push({ key: "qf", matches: qf });
  if (sf.length) steps.push({ key: "sf", matches: sf });
  if (finalCol.length) steps.push({ key: "final", matches: finalCol });
  return steps;
}

/** Pairwise merge until we have `target` centers (standard single-elimination Y alignment). */
function mergeCentersToCount(centers: number[], target: number, H: number): number[] {
  if (target <= 0) return [];
  let c = [...centers];
  while (c.length > target) {
    const next: number[] = [];
    for (let j = 0; j + 1 < c.length; j += 2) {
      next.push((c[j]! + c[j + 1]!) / 2);
    }
    if (c.length % 2 === 1) next.push(c[c.length - 1]!);
    c = next;
  }
  if (c.length === target) return c;
  if (c.length < target) {
    return Array.from({ length: target }, (_, k) => ((k + 1) * H) / (target + 1));
  }
  return c;
}

/**
 * Vertical centers per round so each match sits between its feeders (pairwise merge),
 * using one shared bracket height derived from the leftmost round.
 */
function computeRoundGeometries(
  steps: BracketStep[],
  slotH: number,
  gap: number
): { geoms: Partial<Record<RoundKey, RoundGeom>>; bracketHeight: number } {
  if (steps.length === 0) return { geoms: {}, bracketHeight: 0 };

  const stride = slotH + gap;
  let carry: number[] | null = null;
  let H = 0;
  const geoms: Partial<Record<RoundKey, RoundGeom>> = {};

  for (const { key, matches } of steps) {
    const n = matches.length;
    const isFirst = carry === null;

    if (isFirst) {
      H = n * slotH + Math.max(0, n - 1) * gap;
      carry = Array.from({ length: n }, (_, k) => k * stride + slotH / 2);
    } else if (key === "final" && n === 2) {
      const blockH = 2 * slotH + gap;
      const pad = Math.max(0, (H - blockH) / 2);
      carry = [pad + slotH / 2, pad + slotH + gap + slotH / 2];
    } else {
      carry = mergeCentersToCount(carry!, n, H);
    }

    geoms[key] = { centers: [...carry!], height: H };
  }

  return { geoms, bracketHeight: H };
}

function BracketConnectorQFToSF({
  leftCenters,
  height,
  rightCenters,
}: {
  leftCenters: number[];
  height: number;
  rightCenters: number[];
}) {
  const w = CONNECTOR_WIDTH;
  const h = Math.max(1, height);
  const midX = w / 2;
  const qfCount = leftCenters.length;

  if (qfCount < 2) {
    return (
      <svg
        width="100%"
        height="100%"
        className="block text-[color:var(--bracket-connector-color)]"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" strokeWidth={STROKE} />
      </svg>
    );
  }

  const half = Math.floor(qfCount / 2);
  const topStart = leftCenters[0]!;
  const topEnd = leftCenters[half - 1]!;
  const botStart = leftCenters[half]!;
  const botEnd = leftCenters[qfCount - 1]!;
  const topCenter = half > 0 ? (topStart + topEnd) / 2 : topStart;
  const botCenter = half < qfCount ? (botStart + botEnd) / 2 : topEnd;

  const useRight = rightCenters.length >= 2;
  const rightY1 = useRight ? rightCenters[0]! : topCenter;
  const rightY2 = useRight ? rightCenters[1]! : botCenter;

  return (
    <svg
      width="100%"
      height="100%"
      className="block text-[color:var(--bracket-connector-color)]"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {Array.from({ length: half }, (_, i) => (
        <line
          key={`t-${i}`}
          x1={0}
          y1={leftCenters[i]!}
          x2={midX}
          y2={leftCenters[i]!}
          stroke="currentColor"
          strokeWidth={STROKE}
        />
      ))}
      <line x1={midX} y1={topStart} x2={midX} y2={topEnd} stroke="currentColor" strokeWidth={STROKE} />
      <line x1={midX} y1={rightY1} x2={w} y2={rightY1} stroke="currentColor" strokeWidth={STROKE} />
      {Array.from({ length: qfCount - half }, (_, i) => (
        <line
          key={`b-${i}`}
          x1={0}
          y1={leftCenters[half + i]!}
          x2={midX}
          y2={leftCenters[half + i]!}
          stroke="currentColor"
          strokeWidth={STROKE}
        />
      ))}
      <line x1={midX} y1={botStart} x2={midX} y2={botEnd} stroke="currentColor" strokeWidth={STROKE} />
      <line x1={midX} y1={rightY2} x2={w} y2={rightY2} stroke="currentColor" strokeWidth={STROKE} />
    </svg>
  );
}

const STROKE = 1.5;

function BracketConnectorSFToFinal({
  leftCenters,
  height,
}: {
  leftCenters: number[];
  height: number;
}) {
  const w = CONNECTOR_WIDTH;
  const h = Math.max(1, height);
  const midX = w / 2;

  if (leftCenters.length < 1) {
    return (
      <svg
        width="100%"
        height="100%"
        className="block text-[color:var(--bracket-connector-color)]"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      />
    );
  }

  if (leftCenters.length < 2) {
    return (
      <svg
        width="100%"
        height="100%"
        className="block text-[color:var(--bracket-connector-color)]"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" strokeWidth={STROKE} />
      </svg>
    );
  }

  const topY = leftCenters[0]!;
  const botY = leftCenters[1]!;
  const midY = (topY + botY) / 2;

  return (
    <svg
      width="100%"
      height="100%"
      className="block text-[color:var(--bracket-connector-color)]"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <line x1={0} y1={topY} x2={midX} y2={topY} stroke="currentColor" strokeWidth={STROKE} />
      <line x1={0} y1={botY} x2={midX} y2={botY} stroke="currentColor" strokeWidth={STROKE} />
      <line x1={midX} y1={topY} x2={midX} y2={botY} stroke="currentColor" strokeWidth={STROKE} />
      <line x1={midX} y1={midY} x2={w} y2={midY} stroke="currentColor" strokeWidth={STROKE} />
    </svg>
  );
}

function ConnectorColumn({
  headerSpacer,
  bodyHeight,
  children,
}: {
  headerSpacer: number;
  bodyHeight: number;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col self-start" style={{ width: CONNECTOR_WIDTH }} aria-hidden>
      <div style={{ height: headerSpacer }} />
      <div style={{ height: bodyHeight }}>{children}</div>
    </div>
  );
}

const BracketAlignedColumn = memo(function BracketAlignedColumn({
  matches,
  geom,
  teamRankById,
}: {
  matches: MatchWithTeamNames[];
  geom: RoundGeom | undefined;
  teamRankById: Map<string, number>;
}) {
  if (!geom || matches.length === 0) return null;
  const { centers, height } = geom;
  return (
    <div data-bracket-stack className="relative w-full" style={{ height }}>
      {matches.map((m, i) => {
        const cy = centers[i];
        if (cy == null) return null;
        return (
          <div
            key={m.id}
            data-bracket-match
            className="absolute left-0 right-0 w-full min-w-0 px-0 md:px-0.5"
            style={{ top: cy, transform: "translateY(-50%)" }}
          >
            <MatchCard
              omitCategoryInHeader
              match={m}
              team1Rank={resolveBracketTeamDisplayRank(m.team1Id, teamRankById)}
              team2Rank={resolveBracketTeamDisplayRank(m.team2Id, teamRankById)}
            />
          </div>
        );
      })}
    </div>
  );
});

/** Mobile pager column: top-aligned stack in match order (no bracket geometry / vertical balancing). */
const BracketMobileStack = memo(function BracketMobileStack({
  matches,
  teamRankById,
}: {
  matches: MatchWithTeamNames[];
  teamRankById: Map<string, number>;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="flex w-full flex-col items-stretch justify-start gap-5">
      {matches.map((m) => (
        <div key={m.id} className="w-full min-w-0 shrink-0">
          <MatchCard
            omitCategoryInHeader
            match={m}
            team1Rank={resolveBracketTeamDisplayRank(m.team1Id, teamRankById)}
            team2Rank={resolveBracketTeamDisplayRank(m.team2Id, teamRankById)}
          />
        </div>
      ))}
    </div>
  );
});

/**
 * Match columns: equal flex share of row width when the row fits the viewport (`min-w-full` on the row);
 * each column keeps at least `--match-card-min-width` so the row grows past 100% and the shell scrolls when needed.
 */
function columnFlexClass(singleFinalFullWidth: boolean): string {
  if (singleFinalFullWidth) return "w-full min-w-0 shrink-0 grow";
  return "min-w-[var(--match-card-min-width)] flex-1 basis-0 shrink-0";
}

export function BracketView({
  r16Matches = [],
  qfMatches,
  sfMatches,
  bronzeMatches = [],
  finalMatches,
  teamRankById,
  activeKnockoutColumn,
  suppressMobileRoundTitle = false,
  desktopStageControl,
}: BracketViewProps) {
  const { t } = useLocale();
  const tree = t.matchUi;
  const r16 = useMemo(() => sortByMatchNumber(r16Matches), [r16Matches]);
  const qf = useMemo(() => sortByMatchNumber(qfMatches), [qfMatches]);
  const sf = useMemo(() => sortByMatchNumber(sfMatches), [sfMatches]);
  const bronze = useMemo(() => sortByMatchNumber(bronzeMatches), [bronzeMatches]);
  const fin = useMemo(() => sortByMatchNumber(finalMatches), [finalMatches]);
  const finalCol = useMemo(() => [...fin, ...bronze], [fin, bronze]);

  const bracketRowRef = useRef<HTMLDivElement>(null);
  const [slotH, setSlotH] = useState(SLOT_HEIGHT);
  const [headerBand, setHeaderBand] = useState(HEADER_BAND_FALLBACK);

  const steps = useMemo(
    () => buildSteps(r16, qf, sf, finalCol),
    [r16, qf, sf, finalCol]
  );

  const layoutKey = useMemo(
    () =>
      [
        r16.map((m) => m.id).join("|"),
        qf.map((m) => m.id).join("|"),
        sf.map((m) => m.id).join("|"),
        finalCol.map((m) => m.id).join("|"),
      ].join("~"),
    [r16, qf, sf, finalCol]
  );

  const { geoms, bracketHeight: H } = useMemo(
    () => computeRoundGeometries(steps, slotH, SLOT_GAP),
    [steps, slotH]
  );

  useLayoutEffect(() => {
    const row = bracketRowRef.current;
    if (!row) return;
    const measure = () => {
      const els = row.querySelectorAll<HTMLElement>("[data-bracket-match]");
      let m = SLOT_HEIGHT;
      els.forEach((el) => {
        const h = el.getBoundingClientRect().height;
        if (h > 0) m = Math.max(m, Math.ceil(h));
      });
      setSlotH((prev) => (Math.abs(prev - m) > 1 ? m : prev));

      const stack = row.querySelector<HTMLElement>("[data-bracket-stack]");
      if (stack) {
        const pad = Math.max(0, stack.getBoundingClientRect().top - row.getBoundingClientRect().top);
        setHeaderBand((prev) => (Math.abs(prev - pad) > 0.5 ? pad : prev));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [layoutKey, H]);

  const hasAnyKnockout =
    r16.length > 0 || qf.length > 0 || sf.length > 0 || fin.length > 0 || bronze.length > 0;
  if (!hasAnyKnockout) return null;

  const singleFinalFullWidth =
    steps.length === 1 && steps[0]!.key === "final" && steps[0]!.matches.length === 1;

  const finalHeaderTitle = bronze.length > 0 ? tree.treeFinalBronze : tree.treeFinal;

  const r16Geom = geoms.r16;
  const qfGeom = geoms.qf;
  const sfGeom = geoms.sf;
  const finalGeom = geoms.final;

  const colClass = columnFlexClass(singleFinalFullWidth);

  const renderRoundColumn = (title: string, matches: MatchWithTeamNames[], geom: RoundGeom | undefined) => (
    <div className={`flex flex-col self-start ${colClass}`}>
      <TournamentTreeStageHeader title={title} />
      <div className="pt-4 md:pt-5">
        <BracketAlignedColumn matches={matches} geom={geom} teamRankById={teamRankById} />
      </div>
    </div>
  );

  /** Mobile pager: top-stacked cards; optional duplicate stage header omitted when parent shows title. */
  const mobileColumn = (() => {
    const wrap = (title: string, matches: MatchWithTeamNames[]) => (
      <div className="flex w-full min-w-0 flex-col">
        {suppressMobileRoundTitle ? null : <TournamentTreeStageHeader title={title} />}
        <div className={suppressMobileRoundTitle ? "pt-0" : "pt-2 md:pt-5"}>
          <BracketMobileStack matches={matches} teamRankById={teamRankById} />
        </div>
      </div>
    );

    if (activeKnockoutColumn === "r16" && r16.length > 0) {
      return wrap(tree.treeRoundOf16, r16);
    }
    if (activeKnockoutColumn === "qf" && qf.length > 0) {
      return wrap(tree.treeQuarterfinals, qf);
    }
    if (activeKnockoutColumn === "sf" && sf.length > 0) {
      return wrap(tree.treeSemifinals, sf);
    }
    if (activeKnockoutColumn === "final" && finalCol.length > 0) {
      return wrap(finalHeaderTitle, finalCol);
    }
    return null;
  })();

  const bracketRow = (
    <div
      ref={bracketRowRef}
      className={`flex items-start gap-0 px-0 pb-2 pt-0 ${singleFinalFullWidth ? "w-full" : "w-full min-w-max"}`}
      style={{ minHeight: headerBand + H }}
    >
      {r16.length > 0 && (
        <>
          {renderRoundColumn(tree.treeRoundOf16, r16, r16Geom)}
          {qf.length > 0 && r16Geom && qfGeom ? (
            <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
              <BracketConnectorQFToSF
                leftCenters={r16Geom.centers}
                height={H}
                rightCenters={qfGeom.centers}
              />
            </ConnectorColumn>
          ) : qf.length === 0 && sf.length > 0 && r16Geom && sfGeom ? (
            <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
              <BracketConnectorQFToSF
                leftCenters={r16Geom.centers}
                height={H}
                rightCenters={sfGeom.centers}
              />
            </ConnectorColumn>
          ) : qf.length === 0 &&
            sf.length === 0 &&
            finalCol.length > 0 &&
            r16Geom &&
            finalGeom ? (
            <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
              <BracketConnectorQFToSF
                leftCenters={r16Geom.centers}
                height={H}
                rightCenters={finalGeom.centers}
              />
            </ConnectorColumn>
          ) : null}
        </>
      )}

      {qf.length > 0 && (
        <>
          {renderRoundColumn(tree.treeQuarterfinals, qf, qfGeom)}
          {sf.length > 0 && qfGeom && sfGeom ? (
            <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
              <BracketConnectorQFToSF
                leftCenters={qfGeom.centers}
                height={H}
                rightCenters={sfGeom.centers}
              />
            </ConnectorColumn>
          ) : sf.length === 0 && finalCol.length > 0 && qfGeom && finalGeom ? (
            <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
              <BracketConnectorQFToSF
                leftCenters={qfGeom.centers}
                height={H}
                rightCenters={finalGeom.centers}
              />
            </ConnectorColumn>
          ) : null}
        </>
      )}

      {(sf.length > 0 || fin.length > 0 || bronze.length > 0) && (
        <>
          {sf.length > 0 && (
            <>
              {renderRoundColumn(tree.treeSemifinals, sf, sfGeom)}
              {(fin.length > 0 || bronze.length > 0) && sfGeom && finalGeom && (
                <>
                  <ConnectorColumn headerSpacer={headerBand} bodyHeight={H}>
                    <BracketConnectorSFToFinal leftCenters={sfGeom.centers} height={H} />
                  </ConnectorColumn>
                  {renderRoundColumn(finalHeaderTitle, finalCol, finalGeom)}
                </>
              )}
            </>
          )}
          {sf.length === 0 && finalCol.length > 0 && renderRoundColumn(finalHeaderTitle, finalCol, finalGeom)}
        </>
      )}
    </div>
  );

  return (
    <>
      {mobileColumn ? <div className="w-full md:hidden">{mobileColumn}</div> : null}

      <div
        className={`w-full py-4 ${singleFinalFullWidth ? "" : "overflow-x-auto"} hidden md:block`}
      >
        {desktopStageControl ?? null}
        {bracketRow}
      </div>
    </>
  );
}
