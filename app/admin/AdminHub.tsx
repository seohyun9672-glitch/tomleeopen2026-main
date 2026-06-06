"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TableView } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { TabList } from "@/app/components/ui/TabList";
import { DatabaseLayout } from "@/app/components/database";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { Field } from "@/app/components/ui/Field";
import { PageContainer } from "@/app/components/PageContainer";
import { PlayerForm, type PlayerFormValues } from "@/app/components/PlayerForm";
import { MatchForm } from "@/app/components/MatchForm";
import { MatchCard } from "@/app/components/MatchCard";
import { PlayerCard } from "@/app/components/PlayerCard";
import { RegistrationForm } from "@/app/registration/RegistrationForm";
import { registrationStatusChipClass, registrationStatusLabel, REGISTRATION_STATUSES } from "@/lib/registration";
import type { Match } from "@/lib/matches";
import { categoryStatusChipClass, categoryStatusLabel, CATEGORY_YEAR_STATUSES } from "@/lib/categories";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import type { CategoryRecord } from "@/lib/categories";
import type { ManagedFilterConfig, ManagedCardViewConfig, TableViewConfig } from "@/app/components/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RegistrationRow = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  isDoubles: boolean;
  status: string;
  playerId: number;
  playerNameEn: string;
  playerNameKo: string | null;
  playerEmail: string;
  playerPhone: string | null;
  playerNtrp: string | null;
  playerClubs: string[];
  partnerId: number | null;
  partnerNameEn: string | null;
  partnerNameKo: string | null;
  partnerEmail: string | null;
  partnerPhone: string | null;
  partnerNtrp: string | null;
  partnerClubs: string[];
  nameOnEtransfer: string | null;
  photoVideoConsent: boolean;
  paymentReceived: boolean;
  notes: string | null;
  adminComments: string | null;
  createdAt: string;
};

export type MatchRow = {
  id: string;
  tournamentYear: number;
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  roundCode: string | null;
  roundLabel: string | null;
  roundLabelKo: string | null;
  group: string | null;
  team1Names: string[];
  team1NamesKo: string[];
  team2Names: string[];
  team2NamesKo: string[];
  set1T1: string | null; set2T1: string | null; set3T1: string | null;
  set1T2: string | null; set2T2: string | null; set3T2: string | null;
  matchStatus: string;
  date: string | null;
  time: string | null;
  location: string | null;
  comment: string | null;
  ball: string | null;
};

export type PlayerRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  gender: string | null;
  clubs: string[];
};

export type CategoryRow = CategoryRecord & { status: string; year: number; regCount: number };

export type AdminUserRow = {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
};

export type CategoryStatusRow = {
  tournamentYear: number;
  categoryId: string;
  status: string;
};

export type TeamRow = {
  teamId: string;
  tournamentYear: number;
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  isDoubles: boolean;
  seed: string | null;
  member1NameEn: string;
  member1NameKo: string | null;
  member2NameEn: string | null;
  member2NameKo: string | null;
};

export type PrizeBracketRow = {
  id: string;
  tournamentYear: number;
  isDoubles: boolean;
  teamCountBracket: string;
  first: number;
  second: number;
  third: number;
  fourth: number;
};


// ─── AdminHub props ───────────────────────────────────────────────────────────

export type AdminHubProps = {
  registrations: RegistrationRow[];
  teams: TeamRow[];
  matches: MatchRow[];
  players: PlayerRow[];
  categories: CategoryRecord[];
  categoryStatuses: CategoryStatusRow[];
  adminUsers: AdminUserRow[];
  finalists: string[];
  prizes: PrizeBracketRow[];
};

// ─── Chip helpers ─────────────────────────────────────────────────────────────

function adminUserStatusChipClass(active: boolean): string {
  return active ? "category-status-chip-active" : "category-status-chip-inactive";
}

function parseTimeToHHMM(time: string | null | undefined): string {
  if (!time) return "";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return time.slice(0, 5);
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const isPM = m[3].toUpperCase() === "PM";
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

function computeMatchWinner(m: Pick<MatchRow, "set1T1" | "set2T1" | "set3T1" | "set1T2" | "set2T2" | "set3T2">): 1 | 2 | null {
  const sets: [string | null, string | null][] = [
    [m.set1T1, m.set1T2], [m.set2T1, m.set2T2], [m.set3T1, m.set3T2],
  ];
  let w1 = 0, w2 = 0;
  for (const [s1, s2] of sets) {
    if (s1 == null && s2 == null) continue;
    const n1 = parseInt(s1 ?? "0", 10), n2 = parseInt(s2 ?? "0", 10);
    if (n1 > n2) w1++; else if (n2 > n1) w2++;
  }
  if (w1 >= 2) return 1;
  if (w2 >= 2) return 2;
  if (w1 === 1 && w2 === 0) return 1;
  if (w2 === 1 && w1 === 0) return 2;
  return null;
}

// ─── Shared empty values ──────────────────────────────────────────────────────

const EMPTY_PLAYER: PlayerFormValues = {
  fullNameEn: "", fullNameKo: "", email: "", phone: "", ntrp: "", gender: "", clubs: [],
};


// ─── Registrations Tab ────────────────────────────────────────────────────────


function RegistrationsTab({
  regs,
  categories,
  addOpen,
  onCloseAdd,
  onMutate,
  loading,
}: {
  regs: RegistrationRow[];
  categories: CategoryRecord[];
  addOpen: boolean;
  onCloseAdd: () => void;
  onMutate: () => void;
  loading?: boolean;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const rf = t.registrationForm;
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [regSaving, setRegSaving] = useState(false);
  const [regDeleting, setRegDeleting] = useState(false);
  const [regAddSaving, setRegAddSaving] = useState(false);

  const years = useMemo(
    () => [...new Set(regs.map((r) => r.tournamentYear))].sort((a, b) => b - a),
    [regs],
  );

  const managedFilters: ManagedFilterConfig<RegistrationRow>[] = [
    {
      type: "year",
      years,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
      clearParams: ["cat"],
    },
    {
      type: "category",
      options: (prevItems) => {
        const map = new Map<string, { id: string; label: string; labelKo: string | null }>();
        for (const r of prevItems) {
          if (!map.has(r.categoryId))
            map.set(r.categoryId, { id: r.categoryId, label: r.categoryLabel, labelKo: r.categoryLabelKo ?? null });
        }
        return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
      },
      apply: (items, catId) => (catId ? items.filter((r) => r.categoryId === catId) : items),
      allLabel: t.shared.labels.allCategories,
    },
    {
      type: "status",
      options: REGISTRATION_STATUSES.map((s) => ({ value: s, label: registrationStatusLabel(s, locale) })),
      apply: (items, status) => (status ? items.filter((r) => r.status === status) : items),
      allLabel: t.shared.labels.allStatuses,
    },
  ];

  const view: TableViewConfig<RegistrationRow> = {
    type: "table",
    columns: [
      {
        header: t.shared.labels.year,
        sortKey: "year",
        sortValue: (r) => r.tournamentYear,
        renderCell: (r) => ({ type: "text", value: String(r.tournamentYear) }),
      },
      {
        header: t.shared.labels.category,
        sortKey: "category",
        sortValue: (r) => r.categoryLabel,
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel,
        }),
      },
      {
        header: a.registrations.columns.player,
        sortKey: "player",
        sortValue: (r) => r.playerNameEn,
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.playerNameKo ?? r.playerNameEn) : r.playerNameEn,
        }),
      },
      {
        header: a.registrations.columns.partner,
        sortKey: "partner",
        sortValue: (r) => r.partnerNameEn ?? "",
        renderCell: (r) =>
          r.isDoubles && r.partnerNameEn
            ? {
                type: "text",
                value: locale === "ko" ? (r.partnerNameKo ?? r.partnerNameEn) : r.partnerNameEn,
              }
            : { type: "text", value: null },
      },
      {
        header: t.shared.labels.status,
        sortKey: "status",
        sortValue: (r) => r.status,
        renderCell: (r) => ({
          type: "chips",
          items: [{ label: registrationStatusLabel(r.status, locale), className: registrationStatusChipClass(r.status) }],
        }),
      },
      {
        header: "Payment",
        sortKey: "payment",
        sortValue: (r) => (r.paymentReceived ? 1 : 0),
        renderCell: (r) => ({
          type: "checkbox",
          checked: r.paymentReceived,
          onToggle: r.status === "Cancelled" ? undefined : async (e) => {
            e.stopPropagation();
            await fetch(`/api/registrations/${r.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentReceived: !r.paymentReceived }),
            });
            onMutate();
          },
        }),
      },
      {
        header: "Notes",
        sortKey: "notes",
        sortValue: (r) => r.notes ?? "",
        renderCell: (r) => ({
          type: "text",
          value: r.notes ? (r.notes.length > 40 ? r.notes.slice(0, 40) + "…" : r.notes) : null,
        }),
      },
    ],
    onRowClick: (r) => setEditReg(r),
  };

  return (
    <>
      <DatabaseLayout<RegistrationRow>
        data={regs}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.registrations.empty}
        loading={loading}
        rowCountLabel={locale === "ko" ? ["등록", "등록"] : ["registration", "registrations"]}
      />

      {/* Edit modal */}
      {editReg && (() => {
        const allCategoryIds = [editReg.categoryId];
        const allPartnerNames = editReg.partnerNameEn ? { [editReg.categoryId]: editReg.partnerNameEn } : {};
        const allPartnerIds = editReg.partnerId ? { [editReg.categoryId]: editReg.partnerId } : {};
        const regById = new Map([[editReg.categoryId, editReg]]);

        return (
          <Modal
            open
            onClose={() => setEditReg(null)}
            title={a.registrations.modal.title}
            maxWidthClass="max-w-2xl"
            onDestructive={async () => {
              setRegDeleting(true);
              await fetch(`/api/registrations/${editReg.id}`, { method: "DELETE" });
              setRegDeleting(false);
              setEditReg(null);
              onMutate();
            }}
            destructiveDisabled={regDeleting}
            destructiveLabel={a.actions.delete}
            secondaryAction={{ label: a.actions.cancel, onClick: () => setEditReg(null) }}
            primaryAction={{ label: regSaving ? a.actions.saving : a.actions.save, form: "admin-reg-edit", disabled: regSaving }}
          >
            <RegistrationForm
              key={editReg.id}
              categories={categories}
              year={editReg.tournamentYear}
              player={{
                fullNameEn: editReg.playerNameEn,
                fullNameKo: editReg.playerNameKo ?? "",
                email: editReg.playerEmail,
                phone: editReg.playerPhone ?? "",
                ntrp: editReg.playerNtrp ?? "",
                clubs: editReg.playerClubs,
                playerId: editReg.playerId,
              }}
              categoryIds={allCategoryIds}
              partnerNames={allPartnerNames}
              partnerIds={allPartnerIds}
              nameOnEtransfer={editReg.nameOnEtransfer ?? ""}
              notes={editReg.notes ?? ""}
              adminComments={editReg.adminComments ?? ""}
              mediaConsent={editReg.photoVideoConsent}
              isEdit
              adminFields={{ paymentReceived: editReg.paymentReceived }}
              formId="admin-reg-edit"
              onSavingChange={setRegSaving}
              onSaveOverride={async (data) => {
                const originalCatIds = new Set(allCategoryIds);
                const newCatIds = data.selectedCategoryIds.filter((id) => !originalCatIds.has(id));
                const removedCatIds = allCategoryIds.filter((id) => !data.selectedCategoryIds.includes(id));

                // Update player info
                await fetch(`/api/players/${editReg.playerId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    fullNameEn: data.playerValues.fullNameEn,
                    fullNameKo: data.playerValues.fullNameKo || null,
                    email: data.playerValues.email,
                    phone: data.playerValues.phone || null,
                    ntrp: data.playerValues.ntrp || null,
                    clubs: data.playerValues.clubs,
                  }),
                });

                // Update this registration (status/notes/nameOnEtransfer/category/partner)
                const primaryCatId = data.selectedCategoryIds.includes(editReg.categoryId)
                  ? editReg.categoryId
                  : (data.selectedCategoryIds[0] ?? editReg.categoryId);
                const partnerId = data.partnerIds[primaryCatId] !== undefined ? data.partnerIds[primaryCatId] : undefined;
                const partnerName = data.partnerNames[primaryCatId] ?? null;
                const regRes = await fetch(`/api/registrations/${editReg.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentReceived: data.paymentReceived,
                    categoryId: primaryCatId,
                    notes: data.notes || null,
                    adminComments: data.adminComments || null,
                    nameOnEtransfer: data.nameOnEtransfer || null,
                    photoVideoConsent: data.mediaConsent,
                    ...(partnerId !== undefined ? { partnerId } : { partnerName }),
                  }),
                });
                if (!regRes.ok) {
                  const body = await regRes.json().catch(() => ({}));
                  throw new Error(body.error ?? "Save failed");
                }

                // Create new registrations for any added categories
                if (newCatIds.length > 0) {
                  await fetch("/api/registrations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      tournamentYear: editReg.tournamentYear,
                      fullNameEn: data.playerValues.fullNameEn,
                      fullNameKo: data.playerValues.fullNameKo || null,
                      email: data.playerValues.email,
                      phone: data.playerValues.phone || null,
                      ntrp: data.playerValues.ntrp || null,
                      clubs: data.playerValues.clubs,
                      playerId: editReg.playerId,
                      categories: newCatIds,
                      partnerNames: Object.fromEntries(newCatIds.map((id) => [id, data.partnerNames[id] ?? ""])),
                      nameOnEtransfer: data.nameOnEtransfer || null,
                      photoVideoConsent: data.mediaConsent,
                    }),
                  });
                }

                // Delete removed registrations
                for (const catId of removedCatIds) {
                  const removedReg = regById.get(catId);
                  if (removedReg) {
                    await fetch(`/api/registrations/${removedReg.id}`, { method: "DELETE" });
                  }
                }

                setEditReg(null);
                onMutate();
              }}
              onSuccess={() => { setEditReg(null); onMutate(); }}
            />
          </Modal>
        );
      })()}

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={onCloseAdd}
        title={a.registrations.modal.addTitle}
        maxWidthClass="max-w-2xl"
        secondaryAction={{ label: a.actions.cancel, onClick: onCloseAdd }}
        primaryAction={{ label: regAddSaving ? rf.buttons.submitting : rf.buttons.submit, form: "admin-reg-add", disabled: regAddSaving }}
      >
        <RegistrationForm
          categories={categories}
          year={new Date().getFullYear()}
          formId="admin-reg-add"
          onSavingChange={setRegAddSaving}
          adminFields={{ paymentReceived: false }}
          onSaveOverride={async (data) => {
            const res = await fetch("/api/registrations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tournamentYear: new Date().getFullYear(),
                fullNameEn: data.playerValues.fullNameEn,
                fullNameKo: data.playerValues.fullNameKo || null,
                email: data.playerValues.email,
                phone: data.playerValues.phone || null,
                ntrp: data.playerValues.ntrp || null,
                clubs: data.playerValues.clubs,
                playerId: data.playerId,
                categories: data.selectedCategoryIds,
                partnerNames: data.partnerNames,
                nameOnEtransfer: data.nameOnEtransfer || null,
                photoVideoConsent: false,
                paymentReceived: data.paymentReceived,
                notes: data.notes || null,
              }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              throw new Error(body.error ?? "Add failed");
            }
            onMutate();
            onCloseAdd();
          }}
        />
      </Modal>
    </>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({
  teams,
  loading,
}: {
  teams: TeamRow[];
  loading?: boolean;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;

  const years = useMemo(
    () => [...new Set(teams.map((r) => r.tournamentYear))].sort((a, b) => b - a),
    [teams],
  );

  const managedFilters: ManagedFilterConfig<TeamRow>[] = [
    {
      type: "year",
      years,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
      clearParams: ["cat", "group"],
    },
    {
      type: "category",
      options: (prevItems) => {
        const map = new Map<string, { id: string; label: string; labelKo: string | null }>();
        for (const r of prevItems) {
          if (!map.has(r.categoryId))
            map.set(r.categoryId, { id: r.categoryId, label: r.categoryLabel, labelKo: r.categoryLabelKo ?? null });
        }
        return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
      },
      apply: (items, catId) => (catId ? items.filter((r) => r.categoryId === catId) : items),
      autoSelect: true,
    },
    {
      type: "group",
      options: (prevItems) => {
        const seen = new Set<string>();
        for (const t of prevItems) {
          if (t.seed) seen.add(t.seed);
        }
        return [...seen].sort();
      },
      apply: (items, group) => (group ? items.filter((r) => r.seed === group) : items),
      allLabel: t.shared.labels.allGroups,
      visibleWhen: (v) => !!v.cat,
    },
  ];

  return (
    <DatabaseLayout<TeamRow>
      data={teams}
      managedFilters={managedFilters}
      emptyText={a.teams.empty}
      loading={loading}
      rowCountLabel={locale === "ko" ? ["팀", "팀"] : ["team", "teams"]}
    >
      {(filteredTeams) => {
        type IndexedTeamRow = TeamRow & { rowNum: number };
        const hasGroupData = filteredTeams.some((r) => r.seed);
        const sortedTeams = [...filteredTeams].sort((a, b) => {
          if (hasGroupData) {
            const ga = a.seed ?? "";
            const gb = b.seed ?? "";
            if (ga !== gb) return ga.localeCompare(gb);
          }
          const na = parseInt(a.teamId.match(/(\d+)$/)![1], 10);
          const nb = parseInt(b.teamId.match(/(\d+)$/)![1], 10);
          return na - nb;
        });
        const indexedTeams: IndexedTeamRow[] = sortedTeams.map((r, i) => ({ ...r, rowNum: i + 1 }));
        const hasDoubles = filteredTeams.some((r) => r.isDoubles);
        return (
          <TableView<IndexedTeamRow>
            type="table"
            items={indexedTeams}
            columns={[
              {
                header: a.teams.columns.number,
                sortKey: "num",
                sortValue: (r) => r.rowNum,
                renderCell: (r) => ({ type: "number", value: parseInt(r.teamId.match(/(\d+)$/)![1], 10) }),
              },
              {
                header: a.teams.columns.player1,
                sortKey: "player1",
                sortValue: (r) => r.member1NameEn,
                renderCell: (r) => ({
                  type: "text",
                  value: displayName(r.member1NameEn, r.member1NameKo, locale),
                }),
              },
              ...(hasDoubles ? [{
                header: a.teams.columns.player2,
                sortKey: "player2",
                sortValue: (r: IndexedTeamRow) => r.member2NameEn ?? "",
                renderCell: (r: IndexedTeamRow) => ({
                  type: "text" as const,
                  value: r.member2NameEn ? displayName(r.member2NameEn, r.member2NameKo, locale) : null,
                }),
              }] : []),
              ...(hasGroupData ? [{
                header: a.teams.columns.group,
                sortKey: "group",
                sortValue: (r: IndexedTeamRow) => r.seed ?? "",
                renderCell: (r: IndexedTeamRow) => r.seed
                  ? { type: "chips" as const, items: [{ label: r.seed, className: `group-chip-${r.seed.toLowerCase()}` }] }
                  : { type: "text" as const, value: null },
              }] : []),
            ]}
          />
        );
      }}
    </DatabaseLayout>
  );
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────

function matchRowToMatch(m: MatchRow): Match {
  return {
    id: m.id,
    tournamentYear: m.tournamentYear,
    categoryId: m.categoryId,
    round: m.roundCode != null
      ? {
          id: 0,
          code: m.roundCode,
          labelEn: m.roundLabel ?? m.roundCode,
          labelKo: m.roundLabelKo ?? m.roundLabel ?? m.roundCode,
          sortOrder: 0,
        }
      : null,
    matchNumber: null,
    team1Id: null,
    team2Id: null,
    team1Seed: null,
    team2Seed: null,
    team1DisplayName: m.team1Names.length > 0 ? m.team1Names.join(" / ") : null,
    team2DisplayName: m.team2Names.length > 0 ? m.team2Names.join(" / ") : null,
    // Per-player Ko fallback: if a player has no Ko name, use their En name.
    team1DisplayNameKo: m.team1Names.length > 0
      ? m.team1Names.map((en, i) => m.team1NamesKo[i]?.trim() || en).join(" / ")
      : null,
    team2DisplayNameKo: m.team2Names.length > 0
      ? m.team2Names.map((en, i) => m.team2NamesKo[i]?.trim() || en).join(" / ")
      : null,
    matchStatus: m.matchStatus,
    date: m.date,
    time: m.time,
    location: m.location,
    set1ScoreTeam1: m.set1T1,
    set2ScoreTeam1: m.set2T1,
    set3ScoreTeam1: m.set3T1,
    set1ScoreTeam2: m.set1T2,
    set2ScoreTeam2: m.set2T2,
    set3ScoreTeam2: m.set3T2,
    winner: computeMatchWinner(m),
    comment: m.comment,
    categoryDisplayLabel: m.categoryLabel,
    categoryDisplayLabelKo: m.categoryLabelKo,
  };
}

function MatchesTab({
  matches,
  onMutate,
  loading,
}: {
  matches: MatchRow[];
  onMutate: () => void;
  loading?: boolean;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);
  const [patchedMatches, setPatchedMatches] = useState<Map<string, Partial<MatchRow>>>(new Map());

  const displayMatches = useMemo(
    () => matches.map((m) => patchedMatches.has(m.id) ? { ...m, ...patchedMatches.get(m.id) } : m),
    [matches, patchedMatches],
  );

  const locationOptions = useMemo(
    () => [...new Set(matches.map((m) => m.location).filter((l): l is string => Boolean(l)))].sort(),
    [matches],
  );

  const years = useMemo(
    () => [...new Set(matches.map((m) => m.tournamentYear))].sort((a, b) => b - a),
    [matches],
  );

  const managedFilters: ManagedFilterConfig<MatchRow>[] = [
    {
      type: "year",
      years,
      apply: (items, year) => (year ? items.filter((m) => String(m.tournamentYear) === year) : items),
      clearParams: ["cat", "round", "group"],
    },
    {
      type: "category",
      options: (prevItems) => {
        const map = new Map<string, { id: string; label: string; labelKo: string | null }>();
        for (const m of prevItems) {
          if (!map.has(m.categoryId))
            map.set(m.categoryId, { id: m.categoryId, label: m.categoryLabel, labelKo: m.categoryLabelKo ?? null });
        }
        return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
      },
      apply: (items, catId) => (catId ? items.filter((m) => m.categoryId === catId) : items),
      allLabel: t.shared.labels.allCategories,
      clearParams: ["round", "group"],
    },
    {
      type: "round",
      options: (prevItems) => {
        const seen = new Map<string, { value: string; label: string }>();
        for (const m of prevItems) {
          if (m.roundCode && !seen.has(m.roundCode)) {
            seen.set(m.roundCode, {
              value: m.roundCode,
              label: locale === "ko"
                ? (m.roundLabelKo ?? m.roundLabel ?? m.roundCode)
                : (m.roundLabel ?? m.roundCode),
            });
          }
        }
        const order = ["Pre", "R16", "QF", "SF", "F"];
        return [...seen.values()].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
      },
      apply: (items, roundCode) => roundCode ? items.filter((m) => m.roundCode === roundCode) : items,
      allLabel: t.shared.labels.allRounds,
      clearParams: ["group"],
    },
    {
      type: "group",
      options: (prevItems) => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const m of prevItems) {
          if (m.group && !seen.has(m.group)) { seen.add(m.group); result.push(m.group); }
        }
        return result.sort();
      },
      apply: (items, group) => (group ? items.filter((m) => m.group === group) : items),
      allLabel: t.shared.labels.allGroups,
      visibleWhen: (v) => v.round === "Pre",
    },
  ];

  const view: ManagedCardViewConfig<MatchRow> = {
    getKey: (m) => m.id,
    renderItem: (m) => (
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        onClick={() => setEditMatch(m)}
      >
        <MatchCard match={matchRowToMatch(m)} group={m.group ?? undefined} />
      </button>
    ),
    gridClass: "grid-cols-1",
  };

  return (
    <>
      <DatabaseLayout<MatchRow>
        data={displayMatches}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.matches.empty}
        loading={loading}
        rowCountLabel={locale === "ko" ? ["경기", "경기"] : ["match", "matches"]}
      />
      <Modal
        open={!!editMatch}
        onClose={() => setEditMatch(null)}
        title={a.matches.modal.title}
        maxWidthClass="max-w-lg"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditMatch(null) }}
        primaryAction={{ label: matchSaving ? a.actions.saving : a.actions.save, form: "edit-match", disabled: matchSaving }}
      >
        {editMatch && (
          <MatchForm
            key={editMatch.id}
            matchId={editMatch.id}
            defaultValues={{
              matchStatus: editMatch.matchStatus,
              date: editMatch.date ?? "",
              time: parseTimeToHHMM(editMatch.time),
              location: editMatch.location ?? "",
              comment: editMatch.comment ?? "",
              ball: editMatch.ball ?? null,
              set1T1: editMatch.set1T1 ?? "",
              set2T1: editMatch.set2T1 ?? "",
              set3T1: editMatch.set3T1 ?? "",
              set1T2: editMatch.set1T2 ?? "",
              set2T2: editMatch.set2T2 ?? "",
              set3T2: editMatch.set3T2 ?? "",
            }}
            team1Label={
              editMatch.team1Names.map((en, i) =>
                (locale === "ko" ? editMatch.team1NamesKo[i]?.trim() || en : en)
              ).join(" / ") || a.matches.columns.team1
            }
            team2Label={
              editMatch.team2Names.map((en, i) =>
                (locale === "ko" ? editMatch.team2NamesKo[i]?.trim() || en : en)
              ).join(" / ") || a.matches.columns.team2
            }
            formId="edit-match"
            idPrefix="edit-match"
            locationOptions={locationOptions}
            onSave={(updated) => {
              if (updated && editMatch) {
                const patch: Partial<MatchRow> = {
                  matchStatus: updated.matchStatus,
                  date: updated.date || null,
                  time: updated.time || null,
                  location: updated.location || null,
                  comment: updated.comment || null,
                  set1T1: updated.set1T1 || null,
                  set2T1: updated.set2T1 || null,
                  set3T1: updated.set3T1 || null,
                  set1T2: updated.set1T2 || null,
                  set2T2: updated.set2T2 || null,
                  set3T2: updated.set3T2 || null,
                  ball: updated.ball || null,
                };
                setPatchedMatches((prev) => new Map(prev).set(editMatch.id, patch));
              }
              setEditMatch(null);
              onMutate();
            }}
            onSavingChange={setMatchSaving}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────

function PlayersTab({
  players,
  registrations,
  finalists,
  addOpen,
  onCloseAdd,
  onMutate,
  loading,
}: {
  players: PlayerRow[];
  registrations: RegistrationRow[];
  finalists: string[];
  addOpen: boolean;
  onCloseAdd: () => void;
  onMutate: () => void;
  loading?: boolean;
}) {
  const { t } = useLocale();
  const a = t.adminPage;
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);
  const [editValues, setEditValues] = useState<PlayerFormValues>(EMPTY_PLAYER);
  const [addValues, setAddValues] = useState<PlayerFormValues>(EMPTY_PLAYER);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ntrpLevels, setNtrpLevels] = useState<string[]>([]);
  const [clubOptions, setClubOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ntrp")
      .then((r) => (r.ok ? r.json() : []))
      .then((levels: string[]) => setNtrpLevels(levels))
      .catch(() => {});
    fetch("/api/clubs")
      .then((r) => (r.ok ? r.json() : []))
      .then((clubs: { code: string }[]) => {
        const codes = clubs.map((c) => c.code);
        codes.sort((a, b) => {
          const aN = a.toUpperCase() === "N/A";
          const bN = b.toUpperCase() === "N/A";
          if (aN !== bN) return aN ? 1 : -1;
          return a.localeCompare(b);
        });
        setClubOptions(codes);
      })
      .catch(() => {});
  }, []);

  const finalistsSet = useMemo(() => new Set(finalists), [finalists]);

  function openEdit(p: PlayerRow) {
    setEditPlayer(p);
    setEditValues({
      fullNameEn: p.fullNameEn,
      fullNameKo: p.fullNameKo ?? "",
      email: p.email,
      phone: p.phone ?? "",
      ntrp: p.ntrp ?? "",
      gender: p.gender ?? "",
      clubs: p.clubs,
    });
    setSaveError(null);
  }

  async function savePlayer() {
    if (!editPlayer) return;
    setSaving(true); setSaveError(null);
    const res = await fetch(`/api/players/${editPlayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editValues, gender: editValues.gender || null }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Save failed"); return; }
    setEditPlayer(null);
    onMutate();
  }

  async function deletePlayer() {
    if (!editPlayer) return;
    setDeleting(true); setSaveError(null);
    const res = await fetch(`/api/players/${editPlayer.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? "Delete failed");
      return;
    }
    setEditPlayer(null);
    onMutate();
  }

  async function addPlayer() {
    setSaving(true); setSaveError(null);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addValues, gender: addValues.gender || null }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Add failed"); return; }
    onCloseAdd();
    setAddValues(EMPTY_PLAYER);
    onMutate();
  }

  const participationMap = useMemo(() => {
    const map = new Map<number, { year: number; categoryId: string; finalist: boolean }[]>();
    for (const r of registrations) {
      if (r.status === "Cancelled") continue;
      const finalist = finalistsSet.has(`${r.playerId}:${r.tournamentYear}:${r.categoryId}`);
      const entry = map.get(r.playerId) ?? [];
      entry.push({ year: r.tournamentYear, categoryId: r.categoryId, finalist });
      map.set(r.playerId, entry);
    }
    for (const [, entries] of map) {
      entries.sort((a, b) => b.year - a.year || a.categoryId.localeCompare(b.categoryId));
    }
    return map;
  }, [registrations, finalistsSet]);

  const managedFilters: ManagedFilterConfig<PlayerRow>[] = [
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter(
          (p) =>
            p.fullNameEn.toLowerCase().includes(lower) ||
            (p.fullNameKo ?? "").toLowerCase().includes(lower) ||
            p.email.toLowerCase().includes(lower),
        );
      },
    },
  ];

  const view: ManagedCardViewConfig<PlayerRow> = {
    getKey: (p) => p.id,
    renderItem: (p) => (
      <PlayerCard
        player={p}
        tournaments={participationMap.get(p.id) ?? []}
        onClick={() => openEdit(p)}
      />
    ),
    gridClass: "grid-cols-1 sm:grid-cols-2",
  };

  return (
    <>
      <DatabaseLayout<PlayerRow>
        data={players}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.players.empty}
        loading={loading}
      />

      <Modal
        open={!!editPlayer}
        onClose={() => setEditPlayer(null)}
        title={a.players.modal.editTitle}
        maxWidthClass="max-w-lg"
        onDestructive={deletePlayer}
        destructiveDisabled={deleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditPlayer(null) }}
        primaryAction={{ label: saving ? a.actions.saving : a.actions.save, onClick: savePlayer, disabled: saving }}
      >
        {editPlayer && (
          <div className="flex flex-col gap-4">
            <PlayerForm
              values={editValues}
              onChange={(u) => setEditValues((v) => ({ ...v, ...u }))}
              idPrefix="edit-player"
              ntrpLevels={ntrpLevels}
              clubOptions={clubOptions}
              isAdmin
            />
            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => { onCloseAdd(); setAddValues(EMPTY_PLAYER); }}
        title={a.players.modal.addTitle}
        maxWidthClass="max-w-lg"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { onCloseAdd(); setAddValues(EMPTY_PLAYER); } }}
        primaryAction={{ label: saving ? a.actions.adding : a.actions.add, onClick: addPlayer, disabled: saving || !addValues.fullNameEn.trim() }}
      >
        <div className="flex flex-col gap-4">
          <PlayerForm
            values={addValues}
            onChange={(u) => setAddValues((v) => ({ ...v, ...u }))}
            idPrefix="add-player"
            ntrpLevels={ntrpLevels}
            clubOptions={clubOptions}
            isAdmin
          />
          {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
        </div>
      </Modal>
    </>
  );
}

// ─── Prizes Tab ───────────────────────────────────────────────────────────────

function formatPrize(amount: number): string {
  return amount === 0 ? "$0" : `$${amount.toLocaleString()}`;
}

type PrizeDisplayRow = {
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  isDoubles: boolean;
  year: number;
  teamCount: number;
  bracket: string;
  prizeId: string | null;
  first: number;
  second: number;
  third: number;
  fourth: number;
};

function buildPrizeRows(
  categories: CategoryRecord[],
  teams: TeamRow[],
  prizes: PrizeBracketRow[],
  years: number[],
): PrizeDisplayRow[] {
  const rows: PrizeDisplayRow[] = [];
  for (const year of years) {
    const teamCounts = new Map<string, number>();
    for (const t of teams) {
      if (t.tournamentYear !== year) continue;
      teamCounts.set(t.categoryId, (teamCounts.get(t.categoryId) ?? 0) + 1);
    }
    const prizeMap = new Map<string, PrizeBracketRow>();
    for (const p of prizes) {
      if (p.tournamentYear === year) prizeMap.set(`${p.isDoubles}::${p.teamCountBracket}`, p);
    }
    for (const cat of categories) {
      const teamCount = teamCounts.get(cat.id) ?? 0;
      if (teamCount < 4) continue; // only categories with a valid bracket
      const bracket = teamCount >= 12 ? "12+" : teamCount >= 6 ? "6+" : "4-5";
      const prize = prizeMap.get(`${cat.isDoubles}::${bracket}`);
      rows.push({
        categoryId: cat.id,
        categoryLabel: cat.label,
        categoryLabelKo: cat.labelKo,
        isDoubles: cat.isDoubles,
        year,
        teamCount,
        bracket,
        prizeId: prize?.id ?? null,
        first:  prize?.first  ?? 0,
        second: prize?.second ?? 0,
        third:  prize?.third  ?? 0,
        fourth: prize?.fourth ?? 0,
      });
    }
  }
  return rows;
}

function PrizesTab({
  categories,
  teams,
  prizes,
  onMutate,
  loading,
}: {
  categories: CategoryRecord[];
  teams: TeamRow[];
  prizes: PrizeBracketRow[];
  onMutate: () => void;
  loading?: boolean;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;

  const years = useMemo(
    () => [...new Set(teams.map((t) => t.tournamentYear))].sort((a, b) => b - a),
    [teams],
  );

  const prizeRows = useMemo(
    () => buildPrizeRows(categories, teams, prizes, years),
    [categories, teams, prizes, years],
  );

  const [editRow, setEditRow] = useState<PrizeDisplayRow | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editSecond, setEditSecond] = useState("");
  const [editThird, setEditThird] = useState("");
  const [editFourth, setEditFourth] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit(row: PrizeDisplayRow) {
    setEditRow(row);
    setSaveError(null);
    setEditFirst(String(row.first));
    setEditSecond(String(row.second));
    setEditThird(String(row.third));
    setEditFourth(String(row.fourth));
  }

  async function savePrize() {
    if (!editRow) return;
    setSaving(true); setSaveError(null);
    const amounts = {
      first: parseInt(editFirst, 10) || 0,
      second: parseInt(editSecond, 10) || 0,
      third: parseInt(editThird, 10) || 0,
      fourth: parseInt(editFourth, 10) || 0,
    };
    const res = editRow.prizeId
      ? await fetch(`/api/prizes/${editRow.prizeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(amounts),
        })
      : await fetch("/api/prizes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentYear: editRow.year,
            isDoubles: editRow.isDoubles,
            teamCountBracket: editRow.bracket,
            ...amounts,
          }),
        });
    setSaving(false);
    if (!res.ok) { setSaveError(a.prizes.saveError); return; }
    setEditRow(null);
    onMutate();
  }

  const managedFilters: ManagedFilterConfig<PrizeDisplayRow>[] = [
    {
      type: "year" as const,
      years,
      apply: (items, year) => (year ? items.filter((r) => String(r.year) === year) : items),
      clearParams: ["cat"],
    },
    {
      type: "category" as const,
      options: (prevItems) => {
        const seen = new Map<string, { id: string; label: string; labelKo: string | null }>();
        for (const r of prevItems) {
          if (!seen.has(r.categoryId))
            seen.set(r.categoryId, { id: r.categoryId, label: r.categoryLabel, labelKo: r.categoryLabelKo });
        }
        return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
      },
      apply: (items, catId) => (catId ? items.filter((r) => r.categoryId === catId) : items),
      allLabel: t.shared.labels.allCategories,
    },
  ];

  const view: TableViewConfig<PrizeDisplayRow> = {
    type: "table",
    stableColumnLayout: true,
    columnClass: [undefined, undefined, undefined, undefined, undefined, undefined, "border-l border-[var(--table-border-row)]"],
    columns: [
      {
        header: a.prizes.columns.category,
        sortKey: "category",
        sortValue: (r) => r.categoryLabel,
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel,
        }),
      },
      {
        header: a.prizes.columns.teams,
        renderCell: (r) => ({ type: "number", value: r.teamCount }),
      },
      { header: a.prizes.columns.first,  renderCell: (r) => ({ type: "text", value: formatPrize(r.first) }) },
      { header: a.prizes.columns.second, renderCell: (r) => ({ type: "text", value: formatPrize(r.second) }) },
      { header: a.prizes.columns.third,  renderCell: (r) => ({ type: "text", value: formatPrize(r.third) }) },
      { header: a.prizes.columns.fourth, renderCell: (r) => ({ type: "text", value: formatPrize(r.fourth) }) },
      { header: a.prizes.columns.total,  renderCell: (r) => ({ type: "text", value: formatPrize(r.first + r.second + r.third + r.fourth) }) },
    ],
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<PrizeDisplayRow>
        data={prizeRows}
        managedFilters={managedFilters}
        emptyText={a.prizes.empty}
        loading={loading}
      >
        {(filteredData) => {
          const totalPayout = filteredData.reduce((sum, r) => sum + r.first + r.second + r.third + r.fourth, 0);
          return (
            <div className="flex flex-col gap-2">
              <TableView<PrizeDisplayRow> items={filteredData} {...view} />
              <p className="mt-2 text-right text-xs text-[var(--color-text-tertiary)]">
                {locale === "ko" ? `총 상금: ${formatPrize(totalPayout)}` : `Total payout: ${formatPrize(totalPayout)}`}
              </p>
            </div>
          );
        }}
      </DatabaseLayout>

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={a.prizes.modal.title}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditRow(null) }}
        primaryAction={{ label: saving ? a.actions.saving : a.actions.save, onClick: savePrize, disabled: saving }}
      >
        {editRow && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-row gap-0.5">
                {locale === "ko" ? (editRow.categoryLabelKo ?? editRow.categoryLabel) : editRow.categoryLabel} {editRow.teamCount} {a.prizes.teamsUnit}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field variant="number" id="prize-first"  label={a.prizes.columns.first}  value={editFirst}  onChange={(e) => setEditFirst(e.target.value)} />
              <Field variant="number" id="prize-second" label={a.prizes.columns.second} value={editSecond} onChange={(e) => setEditSecond(e.target.value)} />
              <Field variant="number" id="prize-third"  label={a.prizes.columns.third}  value={editThird}  onChange={(e) => setEditThird(e.target.value)} />
              <Field variant="number" id="prize-fourth" label={a.prizes.columns.fourth} value={editFourth} onChange={(e) => setEditFourth(e.target.value)} />
            </div>
            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  categoryStatuses,
  teams,
  onMutate,
  loading,
}: {
  categories: CategoryRecord[];
  categoryStatuses: CategoryStatusRow[];
  teams: TeamRow[];
  onMutate: () => void;
  loading?: boolean;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const currentYear = new Date().getFullYear();
  const [editRow, setEditRow] = useState<CategoryRow | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set(categoryStatuses.map((s) => s.tournamentYear));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [categoryStatuses, currentYear]);

  const mergedRows: CategoryRow[] = useMemo(() => {
    const ORDER: Record<string, number> = { Active: 0, Pending: 1, Inactive: 2 };
    const teamCounts = new Map<string, number>();
    for (const t of teams) {
      const key = `${t.tournamentYear}::${t.categoryId}`;
      teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
    }
    return years.flatMap((year) => {
      const statusMap = new Map(
        categoryStatuses.filter((s) => s.tournamentYear === year).map((s) => [s.categoryId, s.status]),
      );
      return categories
        .map((cat) => ({ ...cat, status: statusMap.get(cat.id) ?? "Pending", year, regCount: teamCounts.get(`${year}::${cat.id}`) ?? 0 }))
        .sort((a, b) => (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1));
    });
  }, [categories, categoryStatuses, teams, years]);

  function openEdit(row: CategoryRow) {
    setEditRow(row);
    setEditStatus(row.status);
    setSaveError(null);
  }

  async function saveCategory() {
    if (!editRow) return;
    setSaving(true); setSaveError(null);
    const res = await fetch(`/api/categoryStatus/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: editRow.year, status: editStatus }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Save failed"); return; }
    setEditRow(null);
    onMutate();
  }

  const categoryTeams = useMemo(() => {
    if (!editRow) return [];
    return teams.filter((t) => t.tournamentYear === editRow.year && t.categoryId === editRow.id);
  }, [teams, editRow]);

  const view: TableViewConfig<CategoryRow> = {
    type: "table",
    stableColumnLayout: false,
    columns: [
      {
        header: a.categories.columns.label,
        sortKey: "label",
        sortValue: (r) => r.label,
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.labelKo ?? r.label) : r.label,
        }),
      },
      {
        header: a.categories.columns.teams,
        sortKey: "players",
        sortValue: (r) => r.regCount,
        renderCell: (r) => ({
          type: "number",
          value: r.regCount,
        }),
      },
      {
        header: a.categories.columns.status,
        sortKey: "status",
        sortValue: (r) => ({ Active: 0, Pending: 1, Inactive: 2 }[r.status] ?? 1),
        renderCell: (r) => ({
          type: "chips",
          items: [{ label: categoryStatusLabel(r.status, locale), className: categoryStatusChipClass(r.status) }],
        }),
      },
    ],
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<CategoryRow>
          data={mergedRows}
          managedFilters={([
            {
              type: "year" as const,
              years,
              apply: (items: CategoryRow[], year: string) => (year ? items.filter((r) => String(r.year) === year) : items),
            },
            {
              type: "status" as const,
              options: CATEGORY_YEAR_STATUSES.map((s) => ({ value: s, label: categoryStatusLabel(s, locale) })),
              apply: (items: CategoryRow[], status: string) => (status ? items.filter((r) => r.status === status) : items),
              allLabel: t.shared.labels.allStatuses,
            },
          ] satisfies ManagedFilterConfig<CategoryRow>[])}
          view={view}
          emptyText={a.categories.empty}
          loading={loading}
          rowCountLabel={locale === "ko" ? ["카테고리", "카테고리"] : ["category", "categories"]}
        />

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={a.categories.modal.editTitle}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditRow(null) }}
        primaryAction={{ label: saving ? a.actions.saving : a.actions.save, onClick: saveCategory, disabled: saving }}
      >
        {editRow && (
          <div className="flex flex-col gap-5">
            <Field
              variant="select"
              id="cat-status-edit"
              label={`${a.categories.modal.statusLabel} (${editRow.year})`}
              value={editStatus}
              onChange={(e) => setEditStatus((e.target as HTMLSelectElement).value)}
            >
              {CATEGORY_YEAR_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Field>

            {/* Teams list */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                {a.categories.modal.playersTitle}
              </p>
              {categoryTeams.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{a.categories.modal.noPlayers}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {categoryTeams.map((t) => {
                    const p1 = displayName(t.member1NameEn, t.member1NameKo, locale);
                    const p2 = t.member2NameEn ? displayName(t.member2NameEn, t.member2NameKo, locale) : null;
                    return (
                      <div key={t.teamId} className="text-sm">
                        {p2 ? `${p1} / ${p2}` : p1}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Admin Users Tab ──────────────────────────────────────────────────────────

function AdminUsersTab({
  adminUsers,
  addOpen,
  onCloseAdd,
  onMutate,
}: {
  adminUsers: AdminUserRow[];
  addOpen: boolean;
  onCloseAdd: () => void;
  onMutate: () => void;
}) {
  const { t } = useLocale();
  const a = t.adminPage;
  const [addEmail, setAddEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(u: AdminUserRow) {
    setEditUser(u);
    setEditEmail(u.email);
    setEditActive(u.active);
    setEditError(null);
  }

  async function saveAdmin() {
    if (!editUser) return;
    setEditSaving(true); setEditError(null);
    const res = await fetch(`/api/admin-users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editEmail, active: editActive }),
    });
    setEditSaving(false);
    if (!res.ok) { setEditError("Failed to save"); return; }
    setEditUser(null);
    onMutate();
  }

  async function deleteAdmin() {
    if (!editUser) return;
    setEditDeleting(true); setEditError(null);
    const res = await fetch(`/api/admin-users/${editUser.id}`, { method: "DELETE" });
    setEditDeleting(false);
    if (!res.ok) { setEditError("Failed to delete"); return; }
    setEditUser(null);
    onMutate();
  }

  async function addAdmin() {
    setSaving(true); setSaveError(null);
    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Failed to add admin user"); return; }
    onCloseAdd();
    setAddEmail("");
    onMutate();
  }

  const view: TableViewConfig<AdminUserRow> = {
    type: "table",
    columns: [
      {
        header: t.shared.form.email,
        sortKey: "email",
        sortValue: (u) => u.email,
        renderCell: (u) => ({ type: "text", value: u.email }),
      },
      {
        header: a.admins.columns.active,
        renderCell: (u) => ({
          type: "chips",
          items: [{
            label: u.active ? a.admins.activeLabel : a.admins.inactiveLabel,
            className: adminUserStatusChipClass(u.active),
          }],
        }),
      },
    ],
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<AdminUserRow>
        data={adminUsers}
        view={view}
        emptyText={a.admins.empty}
      />

      {/* Edit modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit Admin User"
        maxWidthClass="max-w-sm"
        onDestructive={deleteAdmin}
        destructiveDisabled={editDeleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditUser(null) }}
        primaryAction={{ label: editSaving ? a.actions.saving : a.actions.save, onClick: saveAdmin, disabled: editSaving || !editEmail.trim() }}
      >
        <div className="flex flex-col gap-4">
          <Field
            variant="email"
            id="edit-admin-email"
            label={t.shared.form.email}
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <Field
            variant="select"
            id="edit-admin-active"
            label={a.admins.columns.active}
            value={editActive ? "active" : "inactive"}
            onChange={(e) => setEditActive((e.target as HTMLSelectElement).value === "active")}
          >
            <option value="active">{a.admins.activeLabel}</option>
            <option value="inactive">{a.admins.inactiveLabel}</option>
          </Field>
          {editError && <p className="text-sm text-[var(--color-status-error)]">{editError}</p>}
        </div>
      </Modal>

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => { onCloseAdd(); setAddEmail(""); }}
        title={a.admins.modal.addTitle}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { onCloseAdd(); setAddEmail(""); } }}
        primaryAction={{ label: saving ? a.actions.adding : a.actions.add, onClick: addAdmin, disabled: saving || !addEmail.trim() }}
      >
        <div className="flex flex-col gap-4">
          <Field
            variant="email"
            id="admin-email"
            label={t.shared.form.email}
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
          />
          <p className="text-xs text-[var(--color-text-tertiary)]">{a.admins.modal.note}</p>
          {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
        </div>
      </Modal>
    </>
  );
}

// ─── AdminHub ─────────────────────────────────────────────────────────────────

export function AdminHub({
  registrations,
  teams,
  matches,
  players,
  categories,
  categoryStatuses,
  adminUsers,
  finalists,
  prizes,
}: AdminHubProps) {
  const router = useRouter();
  const { t } = useLocale();
  const a = t.adminPage;
  const [tabParams, setTabParam] = useUrlParams(["tab"] as const);
  const tab = tabParams["tab"] || "registrations";
  const [addRegOpen, setAddRegOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const TABS = [
    { value: "registrations", label: a.tabs.registrations },
    { value: "teams",         label: a.tabs.teams },
    { value: "matches",       label: a.tabs.matches },
    { value: "players",       label: a.tabs.players },
    { value: "categories",    label: a.tabs.categories },
    { value: "prizes",        label: a.tabs.prizes },
    { value: "admins",        label: a.tabs.admins },
  ];

  function handleTabChange(v: string) {
    setTabParam("tab", v, { clear: ["year", "cat", "round", "group", "status", "q"] });
    setAddRegOpen(false);
    setAddPlayerOpen(false);
    setAddAdminOpen(false);
  }

  function refresh() {
    startRefresh(() => { router.refresh(); });
  }

  const titleActions: ReactNode =
    tab === "players" ? (
      <Button variant="secondary" size="small" onClick={() => setAddPlayerOpen(true)}>{a.actions.addPlayer}</Button>
    ) : tab === "admins" ? (
      <Button variant="secondary" size="small" onClick={() => setAddAdminOpen(true)}>{a.actions.addAdminUser}</Button>
    ) : undefined;

  return (
    <PageContainer title={a.title} titleActions={titleActions}>
      <TabList
        tabs={TABS}
        value={tab}
        onSelect={handleTabChange}
        className="mb-[var(--content-gap)]"
      />
      {tab === "registrations" && (
        <RegistrationsTab
          regs={registrations}
          categories={categories}
          addOpen={addRegOpen}
          onCloseAdd={() => setAddRegOpen(false)}
          onMutate={refresh}
          loading={refreshing}
        />
      )}
      {tab === "teams" && (
        <TeamsTab teams={teams} loading={refreshing} />
      )}
      {tab === "matches" && (
        <MatchesTab matches={matches} onMutate={refresh} loading={refreshing} />
      )}
      {tab === "players" && (
        <PlayersTab
          players={players}
          registrations={registrations}
          finalists={finalists}
          addOpen={addPlayerOpen}
          onCloseAdd={() => setAddPlayerOpen(false)}
          onMutate={refresh}
          loading={refreshing}
        />
      )}
      {tab === "categories" && (
        <CategoriesTab
          categories={categories}
          categoryStatuses={categoryStatuses}
          teams={teams}
          onMutate={refresh}
          loading={refreshing}
        />
      )}
      {tab === "prizes" && (
        <PrizesTab
          categories={categories}
          teams={teams}
          prizes={prizes}
          onMutate={refresh}
          loading={refreshing}
        />
      )}
      {tab === "admins" && (
        <AdminUsersTab
          adminUsers={adminUsers}
          addOpen={addAdminOpen}
          onCloseAdd={() => setAddAdminOpen(false)}
          onMutate={refresh}
        />
      )}
    </PageContainer>
  );
}
