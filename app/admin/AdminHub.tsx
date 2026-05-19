"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { TabList } from "@/app/components/ui/TabList";
import { DatabaseLayout } from "@/app/components/database";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { Field } from "@/app/components/ui/Field";
import { CheckboxField } from "@/app/components/ui/Checkbox";
import { PageContainer } from "@/app/components/PageContainer";
import { PlayerForm, type PlayerFormValues } from "@/app/components/PlayerForm";
import { MatchForm, type MatchFormValues } from "@/app/components/MatchForm";
import { RegistrationForm } from "@/app/registration/RegistrationForm";
import {
  REGISTRATION_STATUSES,
  registrationStatusChipClass,
} from "@/lib/registration";
import { matchStatusChipClass, formatDateDisplay } from "@/lib/matches";
import { categoryStatusChipClass, CATEGORY_YEAR_STATUSES } from "@/lib/categories";
import { clubChipClass } from "@/lib/clubs";
import { useLocale } from "@/lib/locale-context";
import type { CategoryRecord } from "@/lib/categories";
import type { ManagedFilterConfig, TableViewConfig } from "@/app/components/database";

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

// ─── Shared empty values ──────────────────────────────────────────────────────

const EMPTY_PLAYER: PlayerFormValues = {
  fullNameEn: "", fullNameKo: "", email: "", phone: "", ntrp: "", clubs: [],
};

const EMPTY_MATCH: MatchFormValues = {
  matchStatus: "Scheduled", date: "", time: "", location: "", comment: "",
  set1T1: "", set2T1: "", set3T1: "", set1T2: "", set2T2: "", set3T2: "",
};

// ─── Registrations Tab ────────────────────────────────────────────────────────

type PlayerSearchResult = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  clubs: string[];
};

type RegEditState = {
  status: string;
  categoryId: string;
  nameOnEtransfer: string;
  photoVideoConsent: boolean;
  notes: string;
  playerNameEn: string;
  playerNameKo: string;
  playerEmail: string;
  playerPhone: string;
  playerNtrp: string;
  playerClubs: string[];
  partnerId: number | null;
  partnerNameEn: string;
  partnerNameKo: string;
  partnerEmail: string;
  partnerPhone: string;
  partnerNtrp: string;
  partnerClubs: string[];
};

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
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [editState, setEditState] = useState<RegEditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const regYear = useMemo(() => {
    const years = [...new Set(regs.map((r) => r.tournamentYear))].sort((a, b) => b - a);
    return years[0] ?? new Date().getFullYear();
  }, [regs]);

  function openEdit(r: RegistrationRow) {
    setEditReg(r);
    setEditState({
      status: r.status,
      categoryId: r.categoryId,
      nameOnEtransfer: r.nameOnEtransfer ?? "",
      photoVideoConsent: r.photoVideoConsent,
      notes: r.notes ?? "",
      playerNameEn: r.playerNameEn,
      playerNameKo: r.playerNameKo ?? "",
      playerEmail: r.playerEmail,
      playerPhone: r.playerPhone ?? "",
      playerNtrp: r.playerNtrp ?? "",
      playerClubs: r.playerClubs,
      partnerId: r.partnerId,
      partnerNameEn: r.partnerNameEn ?? "",
      partnerNameKo: r.partnerNameKo ?? "",
      partnerEmail: r.partnerEmail ?? "",
      partnerPhone: r.partnerPhone ?? "",
      partnerNtrp: r.partnerNtrp ?? "",
      partnerClubs: r.partnerClubs,
    });
    setSaveError(null);
  }

  async function loadPartnerOptions(query: string): Promise<PlayerSearchResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(`/api/players?name=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  }

  function onPartnerSelect(p: PlayerSearchResult) {
    setEditState((s) => s && ({
      ...s,
      partnerId: p.id,
      partnerNameEn: p.fullNameEn,
      partnerNameKo: p.fullNameKo ?? "",
      partnerEmail: p.email,
      partnerPhone: p.phone ?? "",
      partnerNtrp: p.ntrp ?? "",
      partnerClubs: p.clubs,
    }));
  }

  async function saveReg() {
    if (!editReg || !editState) return;
    setSaving(true); setSaveError(null);
    const requests: Promise<Response>[] = [
      fetch(`/api/registrations/${editReg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editState.status,
          categoryId: editState.categoryId,
          notes: editState.notes,
          nameOnEtransfer: editState.nameOnEtransfer,
          photoVideoConsent: editState.photoVideoConsent,
        }),
      }),
      fetch(`/api/players/${editReg.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameEn: editState.playerNameEn,
          fullNameKo: editState.playerNameKo,
          email: editState.playerEmail,
          phone: editState.playerPhone,
          ntrp: editState.playerNtrp,
          clubs: editState.playerClubs,
        }),
      }),
    ];
    if (editState.partnerId) {
      requests.push(
        fetch(`/api/players/${editState.partnerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullNameEn: editState.partnerNameEn,
            fullNameKo: editState.partnerNameKo,
            email: editState.partnerEmail,
            phone: editState.partnerPhone,
            ntrp: editState.partnerNtrp,
            clubs: editState.partnerClubs,
          }),
        }),
      );
    }
    const results = await Promise.all(requests);
    setSaving(false);
    if (results.some((r) => !r.ok)) { setSaveError("Save failed"); return; }
    setEditReg(null);
    onMutate();
  }

  async function deleteReg() {
    if (!editReg) return;
    setDeleting(true); setSaveError(null);
    const res = await fetch(`/api/registrations/${editReg.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { setSaveError("Delete failed"); return; }
    setEditReg(null);
    onMutate();
  }

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
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<RegistrationRow>
        data={regs}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.registrations.empty}
      />

      {/* Edit modal */}
      <Modal open={!!editReg} onClose={() => setEditReg(null)} title={a.registrations.modal.title} maxWidthClass="max-w-lg">
        {editReg && editState && (
          <div className="flex flex-col gap-4">
            {/* Category */}
            <Field
              variant="select"
              id="reg-category"
              label={a.registrations.modal.category}
              value={editState.categoryId}
              onChange={(e) => setEditState((s) => s && ({ ...s, categoryId: (e.target as HTMLSelectElement).value }))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "ko" ? (c.labelKo ?? c.label) : c.label}
                </option>
              ))}
            </Field>

            {/* Player info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                {a.registrations.modal.playerSection}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field variant="text" id="reg-name-en" label={a.registrations.modal.name}
                  value={editState.playerNameEn}
                  onChange={(e) => setEditState((s) => s && ({ ...s, playerNameEn: e.target.value }))} />
                <Field variant="text" id="reg-name-ko" label={a.registrations.modal.nameKo}
                  value={editState.playerNameKo}
                  onChange={(e) => setEditState((s) => s && ({ ...s, playerNameKo: e.target.value }))} />
              </div>
              <Field variant="email" id="reg-email" label={t.shared.form.email}
                value={editState.playerEmail}
                onChange={(e) => setEditState((s) => s && ({ ...s, playerEmail: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field variant="text" id="reg-phone" label={t.shared.form.phone}
                  value={editState.playerPhone}
                  onChange={(e) => setEditState((s) => s && ({ ...s, playerPhone: e.target.value }))} />
                <Field variant="text" id="reg-ntrp" label={t.shared.form.ntrp}
                  value={editState.playerNtrp}
                  onChange={(e) => setEditState((s) => s && ({ ...s, playerNtrp: e.target.value }))} />
              </div>
            </div>

            {editReg.isDoubles && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {a.registrations.modal.partnerName}
                </p>
                <PlayerForm<PlayerSearchResult>
                  values={{
                    fullNameEn: editState.partnerNameEn,
                    fullNameKo: editState.partnerNameKo,
                    email: editState.partnerEmail,
                    phone: editState.partnerPhone,
                    ntrp: editState.partnerNtrp,
                    clubs: editState.partnerClubs,
                  }}
                  onChange={(updates) => setEditState((s) => {
                    if (!s) return s;
                    const next = { ...s };
                    if ("fullNameEn" in updates) next.partnerNameEn = updates.fullNameEn ?? "";
                    if ("fullNameKo" in updates) next.partnerNameKo = updates.fullNameKo ?? "";
                    if ("email" in updates) next.partnerEmail = updates.email ?? "";
                    if ("phone" in updates) next.partnerPhone = updates.phone ?? "";
                    if ("ntrp" in updates) next.partnerNtrp = updates.ntrp ?? "";
                    if ("clubs" in updates) next.partnerClubs = updates.clubs ?? [];
                    return next;
                  })}
                  idPrefix="partner"
                  nameCombobox={{
                    loadOptions: loadPartnerOptions,
                    onSelect: onPartnerSelect,
                    getOptionKey: (p) => p.id,
                    getOptionLabelEn: (p) => p.fullNameEn,
                    getOptionLabelKo: (p) => p.fullNameKo ?? p.fullNameEn,
                  }}
                />
              </div>
            )}

            <Field variant="text" id="reg-etransfer" label={a.registrations.modal.nameOnEtransfer}
              value={editState.nameOnEtransfer}
              onChange={(e) => setEditState((s) => s && ({ ...s, nameOnEtransfer: e.target.value }))} />
            <CheckboxField
              checked={editState.photoVideoConsent}
              onChange={(e) => setEditState((s) => s && ({ ...s, photoVideoConsent: e.target.checked }))}
            >
              {a.registrations.modal.photoConsent}
            </CheckboxField>

            <Field variant="select" id="reg-status" label={t.shared.labels.status}
              value={editState.status}
              onChange={(e) => setEditState((s) => s && ({ ...s, status: (e.target as HTMLSelectElement).value }))}>
              {REGISTRATION_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </Field>

            <Field variant="textarea" id="reg-notes" label={a.registrations.modal.notes}
              value={editState.notes}
              onChange={(e) => setEditState((s) => s && ({ ...s, notes: (e.target as HTMLTextAreaElement).value }))}
              rows={2} />

            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
            <div className="flex justify-between gap-2">
              <Button variant="destructiveOutline" size="small" onClick={deleteReg} disabled={deleting}>
                {deleting ? a.actions.deleting : a.actions.delete}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="small" onClick={() => setEditReg(null)}>{a.actions.cancel}</Button>
                <Button size="small" onClick={saveReg} disabled={saving}>{saving ? a.actions.saving : a.actions.save}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add modal */}
      <Modal open={addOpen} onClose={onCloseAdd} title={a.registrations.modal.addTitle} maxWidthClass="max-w-2xl">
        <RegistrationForm
          categories={categories}
          year={regYear}
          onSuccess={() => { onMutate(); }}
          onCancel={onCloseAdd}
          onComplete={() => { onMutate(); onCloseAdd(); }}
        />
      </Modal>
    </>
  );
}

// ─── Matches Tab ──────────────────────────────────────────────────────────────

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
  const [matchValues, setMatchValues] = useState<MatchFormValues>(EMPTY_MATCH);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const locationOptions = useMemo(
    () => [...new Set(matches.map((m) => m.location).filter((l): l is string => Boolean(l)))].sort(),
    [matches],
  );

  function openEdit(m: MatchRow) {
    setEditMatch(m);
    setMatchValues({
      matchStatus: m.matchStatus,
      date: m.date ?? "",
      time: m.time ?? "",
      location: m.location ?? "",
      comment: m.comment ?? "",
      set1T1: m.set1T1 ?? "",
      set2T1: m.set2T1 ?? "",
      set3T1: m.set3T1 ?? "",
      set1T2: m.set1T2 ?? "",
      set2T2: m.set2T2 ?? "",
      set3T2: m.set3T2 ?? "",
    });
    setSaveError(null);
  }

  async function saveMatch() {
    if (!editMatch) return;
    setSaving(true); setSaveError(null);
    const f = matchValues;
    const res = await fetch(`/api/matches/${editMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchStatus: f.matchStatus,
        date: f.date || null,
        time: f.time || null,
        location: f.location || null,
        comment: f.comment || null,
        set1ScoreTeam1: f.set1T1 || null,
        set2ScoreTeam1: f.set2T1 || null,
        set3ScoreTeam1: f.set3T1 || null,
        set1ScoreTeam2: f.set1T2 || null,
        set2ScoreTeam2: f.set2T2 || null,
        set3ScoreTeam2: f.set3T2 || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setSaveError("Save failed"); return; }
    setEditMatch(null);
    onMutate();
  }

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
    },
  ];

  // Build a code→locale-aware label map for the round column display
  const roundLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of matches) {
      if (m.roundCode && !map.has(m.roundCode)) {
        map.set(
          m.roundCode,
          locale === "ko"
            ? (m.roundLabelKo ?? m.roundLabel ?? m.roundCode)
            : (m.roundLabel ?? m.roundCode),
        );
      }
    }
    return map;
  }, [matches, locale]);

  const view: TableViewConfig<MatchRow> = {
    type: "table",
    columns: [
      {
        header: t.shared.labels.year,
        sortKey: "year",
        sortValue: (m) => m.tournamentYear,
        renderCell: (m) => ({ type: "text", value: String(m.tournamentYear) }),
      },
      {
        header: t.shared.labels.category,
        renderCell: (m) => ({
          type: "text",
          value: locale === "ko" ? (m.categoryLabelKo ?? m.categoryLabel) : m.categoryLabel,
        }),
      },
      {
        header: t.shared.labels.round,
        renderCell: (m) => ({
          type: "text",
          value: m.roundCode ? (roundLabelMap.get(m.roundCode) ?? m.roundCode) : null,
        }),
      },
      {
        header: a.matches.columns.group,
        renderCell: (m) => ({ type: "text", value: m.group }),
      },
      {
        header: a.matches.columns.team1,
        renderCell: (m) => ({
          type: "stack",
          lines: locale === "ko" && m.team1NamesKo.length > 0 ? m.team1NamesKo : m.team1Names,
        }),
      },
      {
        header: a.matches.columns.team2,
        renderCell: (m) => ({
          type: "stack",
          lines: locale === "ko" && m.team2NamesKo.length > 0 ? m.team2NamesKo : m.team2Names,
        }),
      },
      {
        header: a.matches.columns.score,
        renderCell: (m) => {
          const lines = (
            [[m.set1T1, m.set1T2], [m.set2T1, m.set2T2], [m.set3T1, m.set3T2]] as [string | null, string | null][]
          )
            .filter(([a, b]) => a != null || b != null)
            .map(([a, b]) => `${a ?? ""}–${b ?? ""}`);
          return lines.length > 0 ? { type: "stack", lines } : { type: "text", value: null };
        },
      },
      {
        header: t.shared.labels.status,
        renderCell: (m) => ({
          type: "chips",
          items: [{ label: m.matchStatus, className: matchStatusChipClass(m.matchStatus) }],
        }),
      },
      {
        header: t.shared.labels.date,
        sortKey: "date",
        sortValue: (m) => m.date ?? "",
        renderCell: (m) => ({ type: "text", value: formatDateDisplay(m.date, locale) }),
      },
      {
        header: a.matches.columns.time,
        renderCell: (m) => ({ type: "text", value: m.time }),
      },
      {
        header: a.matches.columns.location,
        renderCell: (m) => ({ type: "text", value: m.location }),
      },
    ],
    onRowClick: openEdit,
  };

  return (
    <>
      <DatabaseLayout<MatchRow>
        data={matches}
        managedFilters={managedFilters}
        view={view}
        emptyText={a.matches.empty}
      />
      <Modal open={!!editMatch} onClose={() => setEditMatch(null)} title={a.matches.modal.title} maxWidthClass="max-w-lg">
        {editMatch && (
          <div className="flex flex-col gap-4">
            <MatchForm
              values={matchValues}
              onChange={(u) => setMatchValues((v) => ({ ...v, ...u }))}
              team1Label={
                (locale === "ko" && editMatch.team1NamesKo.length > 0
                  ? editMatch.team1NamesKo
                  : editMatch.team1Names
                ).join(" / ") || a.matches.columns.team1
              }
              team2Label={
                (locale === "ko" && editMatch.team2NamesKo.length > 0
                  ? editMatch.team2NamesKo
                  : editMatch.team2Names
                ).join(" / ") || a.matches.columns.team2
              }
              idPrefix="edit-match"
              locationOptions={locationOptions}
            />
            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="small" onClick={() => setEditMatch(null)}>{a.actions.cancel}</Button>
              <Button size="small" onClick={saveMatch} disabled={saving}>{saving ? a.actions.saving : a.actions.save}</Button>
            </div>
          </div>
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

      <Modal open={!!editPlayer} onClose={() => setEditPlayer(null)} title={a.players.modal.editTitle} maxWidthClass="max-w-lg">
        {editPlayer && (
          <div className="flex flex-col gap-4">
            <PlayerForm
              values={editValues}
              onChange={(u) => setEditValues((v) => ({ ...v, ...u }))}
              idPrefix="edit-player"
            />
            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
            <div className="flex justify-between gap-2">
              <Button variant="destructiveOutline" size="small" onClick={deletePlayer} disabled={deleting}>
                {deleting ? a.actions.deleting : a.actions.delete}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="small" onClick={() => setEditPlayer(null)}>{a.actions.cancel}</Button>
                <Button size="small" onClick={savePlayer} disabled={saving}>{saving ? a.actions.saving : a.actions.save}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => { onCloseAdd(); setAddValues(EMPTY_PLAYER); }}
        title={a.players.modal.addTitle}
        maxWidthClass="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <PlayerForm
            values={addValues}
            onChange={(u) => setAddValues((v) => ({ ...v, ...u }))}
            idPrefix="add-player"
          />
          {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="small" onClick={() => { onCloseAdd(); setAddValues(EMPTY_PLAYER); }}>
              {a.actions.cancel}
            </Button>
            <Button
              size="small"
              onClick={addPlayer}
              disabled={saving || !addValues.fullNameEn.trim()}
            >
              {saving ? a.actions.adding : a.actions.add}
            </Button>
          </div>
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
  const [selectedYear, setSelectedYear] = useState(currentYear);
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
    return categories.map((cat) => ({ ...cat, status: statusMap.get(cat.id) ?? "Pending" }));
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
      <div className="flex flex-col gap-[var(--content-gap)]">
        <div>
          <Field
            variant="select"
            id="cat-year"
            label={t.shared.labels.year}
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number((e.target as HTMLSelectElement).value))}
            wrapperClassName="w-fit"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Field>
        </div>
        <DatabaseLayout<CategoryRow>
          data={mergedRows}
          view={view}
          emptyText={a.categories.empty}
        />
      </div>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={a.categories.modal.editTitle} maxWidthClass="max-w-sm">
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
                  {categoryPlayers.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{locale === "ko" ? (r.playerNameKo ?? r.playerNameEn) : r.playerNameEn}</span>
                      <span className={`inline-flex items-center rounded-2xl border px-2.5 py-0.5 text-xs font-medium ${registrationStatusChipClass(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {saveError && <p className="text-sm text-[var(--color-status-error)]">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="small" onClick={() => setEditRow(null)}>{a.actions.cancel}</Button>
              <Button size="small" onClick={saveCategory} disabled={saving}>{saving ? a.actions.saving : a.actions.save}</Button>
            </div>
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
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="small" onClick={() => { onCloseAdd(); setAddEmail(""); }}>
              {a.actions.cancel}
            </Button>
            <Button
              size="small"
              onClick={addAdmin}
              disabled={saving || !addEmail.trim()}
            >
              {saving ? a.actions.adding : a.actions.add}
            </Button>
          </div>
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
    setTabParam("tab", v);
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
