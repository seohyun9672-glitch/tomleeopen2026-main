"use client";
import type { PrelimsLeaderboardRow } from "@/lib/prelimsLeaderboard";
import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";
import { TableStackedPlayersCell } from "@/app/components/ui/table/tableCells";

type Props = {
  rankHeader: string;
  playersHeader: string;
  wHeader: string;
  lHeader: string;
  sdHeader: string;
  gdHeader: string;
  rows: PrelimsLeaderboardRow[];
};

export function PrelimsLeaderboardTable({
  rankHeader,
  playersHeader,
  wHeader,
  lHeader,
  sdHeader,
  gdHeader,
  rows,
}: Props) {
  const { locale } = useLocale();

  const headers = [rankHeader, playersHeader, wHeader, lHeader, sdHeader, gdHeader];

  const dataRows = rows.map((r) => {
    const p1 = locale === "ko" ? (r.player1Ko ?? r.player1) : r.player1;
    const p2 = r.player2
      ? locale === "ko"
        ? (r.player2Ko ?? r.player2)
        : r.player2
      : undefined;
    const namesText = p2 ? `${p1} / ${p2}` : p1;
    return [
      r.rank,
      <TableStackedPlayersCell key={r.teamId} text={namesText} />,
      r.w,
      r.l,
      r.sd,
      r.gd,
    ];
  });

  return (
    <Table
      variant="data"
      headers={headers}
      dataRows={dataRows}
      columnNoWrap={[true, true, true, true, true, true]}
    />
  );
}
