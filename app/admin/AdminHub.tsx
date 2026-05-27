"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { RegistrationForm } from "@/app/registration/RegistrationForm";
import { registrationStatusChipClass, REGISTRATION_STATUSES } from "@/lib/registration";
import type { Match } from "@/lib/matches";
import { categoryStatusChipClass, CATEGORY_YEAR_STATUSES } from "@/lib/categories";
import { clubChipClass } from "@/lib/clubs";
import { useLocale } from "@/lib/locale-context";
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
  notes: string | null;
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
};

export type PlayerRow = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
};

export type CategoryRow = CategoryRecord & { status: string };

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

// ─── AdminHub props ───────────────────────────────────────────────────────────

export type AdminHubProps = {
  registrations: RegistrationRow[];
  matches: MatchRow[];
  players: PlayerRow[];
  categories: CategoryRecord[];
  categoryStatuses: CategoryStatusRow[];
  adminUsers: AdminUserRow[];
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
  fullNameEn: "", fullNameKo: "", email: "", phone: "", ntrp: "", clubs: [],
};


// ─── Registrations Tab ────────────────────────────────────────────────────────


function RegistrationsTab({
  regs,
  categories,
  addOpen,
  onCloseAdd,
  onMutate,
}: {
  regs: RegistrationRow[];
  categories: CategoryRecord[];
  addOpen: boolean;
  onCloseAdd: () => void;
  onMutate: () => void;
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
      param: "year",
      years,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
      clearParams: ["cat"],
    },
    {
      type: "category",
      param: "cat",
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
      param: "status",
      options: REGISTRATION_STATUSES.map((s) => ({ value: s, label: s })),
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
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel,
        }),
      },
      {
        header: a.registrations.columns.player,
        renderCell: (r) => ({
          type: "text",
          value: locale === "ko" ? (r.playerNameKo ?? r.playerNameEn) : r.playerNameEn,
        }),
      },
      {
        header: a.registrations.columns.partner,
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
        renderCell: (r) => ({
          type: "chips",
          items: [{ label: r.status, className: registrationStatusChipClass(r.status) }],
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
        rowCountLabel={a.tabs.registrations.toLowerCase()}
      />

      {/* Edit modal */}
      <Modal
        open={!!editReg}
        onClose={() => setEditReg(null)}
        title={a.registrations.modal.title}
        maxWidthClass="max-w-2xl"
        onDestructive={async () => {
          if (!editReg) return;
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
        {editReg && (
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
            categoryIds={[editReg.categoryId]}
            partnerNames={editReg.partnerNameEn ? { [editReg.categoryId]: editReg.partnerNameEn } : {}}
            partnerIds={editReg.partnerId ? { [editReg.categoryId]: editReg.partnerId } : {}}
            nameOnEtransfer={editReg.nameOnEtransfer ?? ""}
            mediaConsent={editReg.photoVideoConsent}
            isEdit
            adminFields={{ status: editReg.status, notes: editReg.notes ?? "" }}
            formId="admin-reg-edit"
            onSavingChange={setRegSaving}
            onSaveOverride={async (data) => {
              const catId = data.selectedCategoryIds[0] ?? editReg.categoryId;
              const partnerId = data.partnerIds[catId] ?? editReg.partnerId ?? null;
              await Promise.all([
                fetch(`/api/registrations/${editReg.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: data.status,
                    categoryId: catId,
                    notes: data.notes || null,
                    nameOnEtransfer: data.nameOnEtransfer || null,
                    photoVideoConsent: data.mediaConsent,
                    partnerId,
                  }),
                }),
                fetch(`/api/players/${editReg.playerId}`, {
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
                }),
              ]);
              setEditReg(null);
              onMutate();
            }}
            onSuccess={() => { setEditReg(null); onMutate(); }}
          />
        )}
      </Modal>

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
          onSuccess={() => { onMutate(); }}
          onComplete={() => { onMutate(); onCloseAdd(); }}
        />
      </Modal>
    </>
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
}: {
  matches: MatchRow[];
  onMutate: () => void;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);

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
      param: "year",
      years,
      apply: (items, year) => (year ? items.filter((m) => String(m.tournamentYear) === year) : items),
      clearParams: ["cat", "round", "group"],
    },
    {
      type: "category",
      param: "cat",
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
      param: "round",
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
      param: "group",
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
    gridClass: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  };

  return (
    <>
      <DatabaseLayout<MatchRow>
        data={matches}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.matches.empty}
        rowCountLabel={a.tabs.matches.toLowerCase()}
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
            idPrefix="edit-match"
            locationOptions={locationOptions}
            onSave={() => { setEditMatch(null); onMutate(); }}
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
  addOpen,
  onCloseAdd,
  onMutate,
}: {
  players: PlayerRow[];
  addOpen: boolean;
  onCloseAdd: () => void;
  onMutate: () => void;
}) {
  const { t } = useLocale();
  const a = t.adminPage;
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);
  const [editValues, setEditValues] = useState<PlayerFormValues>(EMPTY_PLAYER);
  const [addValues, setAddValues] = useState<PlayerFormValues>(EMPTY_PLAYER);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openEdit(p: PlayerRow) {
    setEditPlayer(p);
    setEditValues({
      fullNameEn: p.fullNameEn,
      fullNameKo: p.fullNameKo ?? "",
      email: p.email,
      phone: p.phone ?? "",
      ntrp: p.ntrp ?? "",
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
      body: JSON.stringify(editValues),
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
    if (!res.ok) { setSaveError("Delete failed"); return; }
    setEditPlayer(null);
    onMutate();
  }

  async function addPlayer() {
    setSaving(true); setSaveError(null);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addValues),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Add failed"); return; }
    onCloseAdd();
    setAddValues(EMPTY_PLAYER);
    onMutate();
  }

  const managedFilters: ManagedFilterConfig<PlayerRow>[] = [
    {
      type: "search",
      param: "q",
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

  const view: TableViewConfig<PlayerRow> = {
    type: "table",
    columns: [
      {
        header: t.shared.labels.name,
        sortKey: "name",
        sortValue: (p) => p.fullNameEn,
        renderCell: (p) => ({ type: "stack", lines: [p.fullNameEn, p.fullNameKo ?? null] }),
      },
      { header: t.shared.form.email, renderCell: (p) => ({ type: "text", value: p.email }) },
      { header: t.shared.form.phone, renderCell: (p) => ({ type: "text", value: p.phone }) },
      { header: t.shared.form.ntrp, renderCell: (p) => ({ type: "text", value: p.ntrp }) },
      {
        header: a.players.columns.clubs,
        renderCell: (p) => ({
          type: "chips",
          items: p.clubs.map((c) => ({ label: c, className: clubChipClass(c) })),
        }),
      },
    ],
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<PlayerRow>
        data={players}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.players.empty}
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
          />
          {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
        </div>
      </Modal>
    </>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  categoryStatuses,
  registrations,
  onMutate,
}: {
  categories: CategoryRecord[];
  categoryStatuses: CategoryStatusRow[];
  registrations: RegistrationRow[];
  onMutate: () => void;
}) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const currentYear = new Date().getFullYear();
  // Year is managed by DatabaseLayout's year filter; read it here for data derivation.
  const searchParams = useSearchParams();
  const selectedYear = Number(searchParams.get("catYear")) || currentYear;
  const [editRow, setEditRow] = useState<CategoryRow | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set(categoryStatuses.map((s) => s.tournamentYear));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [categoryStatuses, currentYear]);

  const regCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of registrations) {
      if (r.tournamentYear === selectedYear) {
        map.set(r.categoryId, (map.get(r.categoryId) ?? 0) + 1);
      }
    }
    return map;
  }, [registrations, selectedYear]);

  const mergedRows: CategoryRow[] = useMemo(() => {
    const statusMap = new Map(
      categoryStatuses
        .filter((s) => s.tournamentYear === selectedYear)
        .map((s) => [s.categoryId, s.status]),
    );
    return categories
      .map((cat) => ({ ...cat, status: statusMap.get(cat.id) ?? "Pending" }))
      .sort((a, b) => {
        if (a.status === "Active" && b.status !== "Active") return -1;
        if (b.status === "Active" && a.status !== "Active") return 1;
        return 0;
      });
  }, [categories, categoryStatuses, selectedYear]);

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
      body: JSON.stringify({ year: selectedYear, status: editStatus }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Save failed"); return; }
    setEditRow(null);
    onMutate();
  }

  // Players registered for the selected category + year
  const categoryPlayers = useMemo(() => {
    if (!editRow) return [];
    return registrations.filter(
      (r) => r.tournamentYear === selectedYear && r.categoryId === editRow.id,
    );
  }, [registrations, selectedYear, editRow]);

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
        header: a.categories.columns.players,
        renderCell: (r) => ({
          type: "text",
          value: String(regCountMap.get(r.id) ?? 0),
        }),
      },
      {
        header: a.categories.columns.status,
        renderCell: (r) => ({
          type: "chips",
          items: [{ label: r.status, className: categoryStatusChipClass(r.status) }],
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
              param: "catYear",
              years,
              apply: (items: CategoryRow[]) => items, // mergedRows is already year-filtered
            },
            {
              type: "status" as const,
              param: "catStatus",
              options: CATEGORY_YEAR_STATUSES.map((s) => ({ value: s, label: s })),
              apply: (items: CategoryRow[], status: string) => (status ? items.filter((r) => r.status === status) : items),
              allLabel: t.shared.labels.allStatuses,
            },
          ] satisfies ManagedFilterConfig<CategoryRow>[])}
          view={view}
          emptyText={a.categories.empty}
          rowCountLabel={a.tabs.categories.toLowerCase()}
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
              label={`${a.categories.modal.statusLabel} (${selectedYear})`}
              value={editStatus}
              onChange={(e) => setEditStatus((e.target as HTMLSelectElement).value)}
            >
              {CATEGORY_YEAR_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Field>

            {/* Players list */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                {a.categories.modal.playersTitle}
              </p>
              {categoryPlayers.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{a.categories.modal.noPlayers}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {categoryPlayers.map((r) => {
                    const p1 = locale === "ko" ? (r.playerNameKo?.trim() || r.playerNameEn) : r.playerNameEn;
                    const p2 = r.isDoubles && r.partnerNameEn
                      ? (locale === "ko" ? (r.partnerNameKo?.trim() || r.partnerNameEn) : r.partnerNameEn)
                      : null;
                    return (
                      <div key={r.id} className="text-sm">
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
      {
        header: a.admins.columns.created,
        sortKey: "date",
        sortValue: (u) => u.createdAt,
        renderCell: (u) => ({ type: "text", value: u.createdAt.slice(0, 10) }),
      },
    ],
  };

  return (
    <>
      <DatabaseLayout<AdminUserRow>
        data={adminUsers}
        view={view}
        emptyText={a.admins.empty}
      />

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
  matches,
  players,
  categories,
  categoryStatuses,
  adminUsers,
}: AdminHubProps) {
  const router = useRouter();
  const { t } = useLocale();
  const a = t.adminPage;
  const [tabParams, setTabParam] = useUrlParams(["tab"] as const);
  const tab = tabParams["tab"] || "registrations";
  const [addRegOpen, setAddRegOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);

  const TABS = [
    { value: "registrations", label: a.tabs.registrations },
    { value: "matches",       label: a.tabs.matches },
    { value: "players",       label: a.tabs.players },
    { value: "categories",    label: a.tabs.categories },
    { value: "admins",        label: a.tabs.admins },
  ];

  function handleTabChange(v: string) {
    setTabParam("tab", v, { clear: ["year", "cat", "round", "group", "status", "catStatus", "catYear", "q"] });
    setAddRegOpen(false);
    setAddPlayerOpen(false);
    setAddAdminOpen(false);
  }

  function refresh() {
    router.refresh();
  }

  const titleActions: ReactNode =
    tab === "registrations" ? (
      <Button variant="secondary" size="small" onClick={() => setAddRegOpen(true)}>{a.actions.addRegistration}</Button>
    ) : tab === "players" ? (
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
        />
      )}
      {tab === "matches" && (
        <MatchesTab matches={matches} onMutate={refresh} />
      )}
      {tab === "players" && (
        <PlayersTab
          players={players}
          addOpen={addPlayerOpen}
          onCloseAdd={() => setAddPlayerOpen(false)}
          onMutate={refresh}
        />
      )}
      {tab === "categories" && (
        <CategoriesTab
          categories={categories}
          categoryStatuses={categoryStatuses}
          registrations={registrations}
          onMutate={refresh}
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
