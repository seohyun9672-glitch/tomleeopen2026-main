"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TableView } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { TabList } from "@/app/components/ui/TabList";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { DatabaseLayout } from "@/app/components/database";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { PageContainer } from "@/app/components/PageContainer";
import { EntityForm, type FormValues } from "@/app/components/forms";
import {
  playerFields, adminUserFields, categoryFields, prizeFields,
  matchFields, registrationFields, giveawayFields,
} from "@/lib/field-configs";
import { Collapsible } from "@/app/components/ui/Collapsible";
import { Field } from "@/app/components/ui/Field";
import { cn, getToday } from "@/lib/utils";
import { MatchCard } from "@/app/components/MatchCard";
import { PlayerCard } from "@/app/components/PlayerCard";
import { registrationStatusChipClass, registrationStatusLabel, REGISTRATION_STATUSES } from "@/lib/registration";
import type { Match } from "@/lib/matches";
import { formatDateDisplay, formatTimeDisplay, computeWinner, matchStatusSortOrder, matchStatusLabel, matchStatusChipClass, matchSeqNumber } from "@/lib/matches";
import { categoryStatusChipClass, categoryStatusLabel, CATEGORY_YEAR_STATUSES } from "@/lib/categories";
import { derivePrelimFormat } from "@/lib/generateMatches";
import {
  type CategorySeedState,
  buildCategoryState,
  deriveGroupCount,
  toTeamOption,
} from "@/lib/seeding";
import { getYear, parseTimeToHHMM, formatPrize, makeGroupBreakBefore } from "@/lib/utils";
import { deriveCourtBookingStatus } from "@/lib/content/courts";
import { ROUND_SORT_ORDER } from "@/lib/rounds";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import type { CategoryRecord } from "@/lib/categories";
import type { ManagedFilterConfig, ManagedCardViewConfig, TableViewConfig } from "@/app/components/database";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  playerGender: string | null;
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
  ballReceived: boolean;
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
  prelimFormat?: string | null;
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
  categoryId: string;
  first: number;
  second: number;
  third: number;
  fourth: number;
};

export type GiveawayRow = {
  id: string;
  tournamentYear: number;
  playerId: number;
  playerNameEn: string;
  playerNameKo: string | null;
  optionId: string;
  optionId2: string | null;
  pickupClub: string | null;
  pickupNote: string | null;
  received: boolean;
  received2: boolean;
  createdAt: string;
};

export type TumblerOptionRow = {
  optionId: string;
  label: string;
  imageSrc: string | null;
  stock: number;
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
  courtBookings: CourtBookingAdminRow[];
  giveaways: GiveawayRow[];
  tumblerOptions: TumblerOptionRow[];
  drawsPublished: boolean;
};

// ─── Shared empty values ──────────────────────────────────────────────────────

const EMPTY_PLAYER: FormValues = {
  fullNameEn: "", fullNameKo: "", email: "", phone: "", ntrp: "", gender: "", clubs: [],
};


// ─── Prize display row ────────────────────────────────────────────────────────

type PrizeDisplayRow = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  categoryLabelKo: string | null;
  year: number;
  teamCount: number;
  first: number; second: number; third: number; fourth: number;
};

// ─── Court booking types ──────────────────────────────────────────────────────

export type BookingMember = { fullNameEn: string; fullNameKo: string | null };
export type BookingSide = { member1: BookingMember; member2: BookingMember | null } | null;

export type BookingMatch = {
  id?: string;
  myTeamId?: string | null;
  team1Id: string | null;
  team2Id: string | null;
  team1: BookingSide;
  team2: BookingSide;
  category: { label: string; labelKo: string | null } | null;
  courtBooking?: { courtId: string; date: string } | null;
};

export type CourtBookingAdminRow = {
  id: string;
  courtId: string;
  date: string;
  teamId: string | null;
  matchId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  court: { name: string; nameKo: string; timeSlot: string } | null;
  team: { id: string; member1: BookingMember; member2: BookingMember | null; category: { label: string; labelKo: string | null } } | null;
  match: BookingMatch | null;
  bookedByPlayer: { fullNameEn: string; fullNameKo: string | null } | null;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

function matchRowToMatch(m: MatchRow): Match {
  return {
    id: m.id,
    tournamentYear: m.tournamentYear,
    categoryId: m.categoryId,
    round: m.roundCode != null
      ? { id: 0, code: m.roundCode, labelEn: m.roundLabel ?? m.roundCode, labelKo: m.roundLabelKo ?? m.roundLabel ?? m.roundCode, sortOrder: 0 }
      : null,
    team1Id: null, team2Id: null, team1Seed: null, team2Seed: null,
    team1DisplayName: m.team1Names.length > 0 ? m.team1Names.join(" / ") : null,
    team2DisplayName: m.team2Names.length > 0 ? m.team2Names.join(" / ") : null,
    team1DisplayNameKo: m.team1Names.length > 0
      ? m.team1Names.map((en, i) => m.team1NamesKo[i]?.trim() || en).join(" / ") : null,
    team2DisplayNameKo: m.team2Names.length > 0
      ? m.team2Names.map((en, i) => m.team2NamesKo[i]?.trim() || en).join(" / ") : null,
    matchStatus: m.matchStatus,
    date: m.date, time: m.time, location: m.location,
    set1ScoreTeam1: m.set1T1, set2ScoreTeam1: m.set2T1, set3ScoreTeam1: m.set3T1,
    set1ScoreTeam2: m.set1T2, set2ScoreTeam2: m.set2T2, set3ScoreTeam2: m.set3T2,
    winner: computeWinner({ set1ScoreTeam1: m.set1T1, set2ScoreTeam1: m.set2T1, set3ScoreTeam1: m.set3T1, set1ScoreTeam2: m.set1T2, set2ScoreTeam2: m.set2T2, set3ScoreTeam2: m.set3T2 }),
    comment: m.comment,
    categoryDisplayLabel: m.categoryLabel,
    categoryDisplayLabelKo: m.categoryLabelKo,
  };
}

const MATCH_STATUS_TABS = ["All", "Pending", "Scheduled", "Completed", "Cancelled"];
const COURT_BOOKING_STATUS_TABS = ["All", "Available", "Booked", "Completed", "Expired"];
const REGISTRATION_STATUS_TABS = ["All", ...REGISTRATION_STATUSES];

function matchIdLabel(m: MatchRow): string {
  const seq = m.roundCode ? matchSeqNumber(m.id, m.roundCode) : 0;
  const roundPart = m.group || seq > 0 ? `${m.roundCode}#${m.group ?? ""}${seq > 0 ? seq : ""}` : m.roundCode;
  return [m.categoryId, roundPart].filter(Boolean).join(" · ");
}

function deriveMatchStatus(v: FormValues): string {
  const hasSchedule = !!String(v.date ?? "").trim() && !!String(v.time ?? "").trim() && !!String(v.location ?? "").trim();
  const hasSet1 = !!String(v.set1T1 ?? "").trim() && !!String(v.set1T2 ?? "").trim();
  const hasSet2 = !!String(v.set2T1 ?? "").trim() && !!String(v.set2T2 ?? "").trim();
  if (hasSchedule && hasSet1 && hasSet2) return "Completed";
  if (hasSchedule) return "Scheduled";
  return "Pending";
}

function validateMatchFields(v: FormValues): Record<string, string> {
  const isCancelled = String(v.matchStatus ?? "").toLowerCase() === "cancelled";
  const isWalkover = v.team1Withdrawn === "true" || v.team2Withdrawn === "true";
  if (isCancelled || isWalkover) return {};

  const errs: Record<string, string> = {};
  // Schedule: if any schedule field is set, all three are required
  const hasDate = !!String(v.date ?? "").trim();
  const hasTime = !!String(v.time ?? "").trim();
  const hasLocation = !!String(v.location ?? "").trim();
  if (hasDate || hasTime || hasLocation) {
    if (!hasDate) errs["date"] = "Required";
    if (!hasTime) errs["time"] = "Required";
    if (!hasLocation) errs["location"] = "Required";
  }
  // Scores: if one side of a set is filled, both are required
  for (const [k1, k2] of [["set1T1", "set1T2"], ["set2T1", "set2T2"], ["set3T1", "set3T2"]] as const) {
    const v1 = !!String(v[k1] ?? "").trim();
    const v2 = !!String(v[k2] ?? "").trim();
    if (v1 && !v2) errs[k2] = "Required";
    if (!v1 && v2) errs[k1] = "Required";
  }
  return errs;
}

function sideLabel(side: BookingSide, loc: "en" | "ko"): string | null {
  if (!side) return null;
  const m1 = displayName(side.member1.fullNameEn, side.member1.fullNameKo, loc);
  const m2 = side.member2 ? displayName(side.member2.fullNameEn, side.member2.fullNameKo, loc) : null;
  return m2 ? `${m1} / ${m2}` : m1;
}

function matchDisplayLabel(match: BookingMatch | null, loc: "en" | "ko"): string | null {
  if (!match) return null;
  const cat = match.category ? displayName(match.category.label, match.category.labelKo, loc) : null;
  const teams = [sideLabel(match.team1, loc), sideLabel(match.team2, loc)].filter(Boolean).join(" vs ");
  return cat ? `${cat} · ${teams}` : teams;
}

const CHECK_ICON = (
  <svg
    className="h-3.5 w-3.5 shrink-0 text-[var(--status-success-fg)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

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
  courtBookings,
  giveaways,
  tumblerOptions,
  drawsPublished,
}: AdminHubProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const cb = t.courtBookingPage;
  const sm = a.teams.seedModal;
  const currentYear = useMemo(() => getYear(), []);
  const [tabParams, setTabParam] = useUrlParams(["tab"] as const);
  const tab = tabParams["tab"] || "registrations";
  const [matchStatusParams, setMatchStatusParam] = useUrlParams(["status"] as const);
  const matchStatusTab = MATCH_STATUS_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const courtStatusTab = COURT_BOOKING_STATUS_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const regStatusTab = REGISTRATION_STATUS_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const [addRegOpen, setAddRegOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  function refresh() { startRefresh(() => { router.refresh(); }); }

  // ─── Registrations ────────────────────────────────────────────────────────
  const [editReg, setEditReg] = useState<RegistrationRow | null>(null);
  const [editRegValues, setEditRegValues] = useState<FormValues>({});
  const [editRegErrors, setEditRegErrors] = useState<Record<string, string>>({});
  const [regSaving, setRegSaving] = useState(false);
  const [regDeleting, setRegDeleting] = useState(false);
  const [addRegValues, setAddRegValues] = useState<FormValues>({});
  const [addRegErrors, setAddRegErrors] = useState<Record<string, string>>({});
  const [regAddSaving, setRegAddSaving] = useState(false);

  const doublesCategories = useMemo(() => categories.filter((c) => c.isDoubles), [categories]);

  const editRegPlayerId = editReg ? (editRegValues.playerId as string | undefined) : undefined;
  const editRegFields = useMemo(
    () => editReg ? registrationFields(t, locale, doublesCategories, categories, editRegPlayerId ?? null, { isAdmin: true }) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editReg?.id, editRegPlayerId, locale, doublesCategories, categories],
  );

  const addRegPlayerId = addRegValues.playerId as string | undefined;
  const addRegFields = useMemo(
    () => registrationFields(t, locale, doublesCategories, categories, addRegPlayerId ?? null, { isAdmin: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addRegPlayerId, locale, doublesCategories, categories],
  );

  async function handleSaveEdit() {
    if (!editReg) return;
    setRegSaving(true);
    try {
      const selectedCategoryIds = Array.isArray(editRegValues.categories)
        ? (editRegValues.categories as string[])
        : [editReg.categoryId];

      const targetPlayerId = editRegValues.playerId ? Number(editRegValues.playerId) : editReg.playerId;
      const playerChanged = targetPlayerId !== editReg.playerId;

      const primaryCatId = selectedCategoryIds.includes(editReg.categoryId)
        ? editReg.categoryId
        : (selectedCategoryIds[0] ?? editReg.categoryId);
      const newCatIds = selectedCategoryIds.filter((id) => id !== editReg.categoryId);
      const catIsDoubles = categories.find((c) => c.id === primaryCatId)?.isDoubles ?? false;

      if (!playerChanged) {
        await fetch(`/api/players/${targetPlayerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullNameEn: String(editRegValues.fullNameEn ?? "").trim(),
            fullNameKo: String(editRegValues.fullNameKo ?? "").trim() || null,
            email: String(editRegValues.email ?? "").trim(),
            phone: String(editRegValues.phone ?? "").trim() || null,
            ntrp: String(editRegValues.ntrp ?? "").trim() || null,
            gender: String(editRegValues.gender ?? "").trim() || null,
            clubs: Array.isArray(editRegValues.clubs) ? editRegValues.clubs : [],
          }),
        });
      }

      const partnerIdRaw = editRegValues[`partnerId_${primaryCatId}`];
      const partnerName = String(editRegValues[`partner_${primaryCatId}`] ?? "").trim();
      const partnerPayload = catIsDoubles
        ? (partnerIdRaw != null && partnerIdRaw !== ""
            ? { partnerId: Number(partnerIdRaw) }
            : { partnerName: partnerName || null })
        : { partnerId: null };

      const regRes = await fetch(`/api/registrations/${editReg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(playerChanged ? { playerId: targetPlayerId } : {}),
          status: String(editRegValues.status ?? "").trim() || undefined,
          paymentReceived: editRegValues.paymentReceived === "true",
          categoryId: primaryCatId,
          notes: String(editRegValues.notes ?? "").trim() || null,
          adminComments: String(editRegValues.adminComments ?? "").trim() || null,
          nameOnEtransfer: String(editRegValues.nameOnEtransfer ?? "").trim() || null,
          photoVideoConsent: editRegValues.mediaConsent === "true",
          ...partnerPayload,
        }),
      });
      if (!regRes.ok) {
        const body = await regRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Save failed");
      }

      for (const newCatId of newCatIds) {
        const newCatIsDoubles = categories.find((c) => c.id === newCatId)?.isDoubles ?? false;
        const newPartnerIdRaw = editRegValues[`partnerId_${newCatId}`];
        const newPartnerName = String(editRegValues[`partner_${newCatId}`] ?? "").trim();
        await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentYear: editReg.tournamentYear,
            fullNameEn: String(editRegValues.fullNameEn ?? "").trim(),
            fullNameKo: String(editRegValues.fullNameKo ?? "").trim() || null,
            email: String(editRegValues.email ?? "").trim(),
            phone: String(editRegValues.phone ?? "").trim() || null,
            ntrp: String(editRegValues.ntrp ?? "").trim() || null,
            clubs: Array.isArray(editRegValues.clubs) ? editRegValues.clubs : [],
            playerId: targetPlayerId,
            categories: [newCatId],
            partnerNames: newCatIsDoubles && newPartnerName ? { [newCatId]: newPartnerName } : {},
            partnerIds: newCatIsDoubles && newPartnerIdRaw ? { [newCatId]: Number(newPartnerIdRaw) } : {},
            paymentReceived: editRegValues.paymentReceived === "true",
          }),
        });
      }

      setEditReg(null);
      setEditRegValues({});
      refresh();
    } catch (err) {
      setEditRegErrors({ submit: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setRegSaving(false);
    }
  }

  async function deleteRegistration() {
    if (!editReg) return;
    setRegDeleting(true);
    await fetch(`/api/registrations/${editReg.id}`, { method: "DELETE" });
    setRegDeleting(false);
    setEditReg(null);
    refresh();
  }

  async function handleSaveAdd() {
    setRegAddSaving(true);
    try {
      const selectedCategoryIds = Array.isArray(addRegValues.categories)
        ? (addRegValues.categories as string[])
        : [];
      const selectedDoublesIds = selectedCategoryIds.filter((id) => doublesCategories.some((c) => c.id === id));
      const partnerNames: Record<string, string> = {};
      const partnerIds: Record<string, number> = {};
      for (const id of selectedDoublesIds) {
        const name = String(addRegValues[`partner_${id}`] ?? "").trim();
        if (name) partnerNames[id] = name;
        const pid = addRegValues[`partnerId_${id}`];
        if (pid) partnerIds[id] = Number(pid);
      }
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentYear: getYear(),
          fullNameEn: String(addRegValues.fullNameEn ?? "").trim(),
          fullNameKo: String(addRegValues.fullNameKo ?? "").trim() || null,
          email: String(addRegValues.email ?? "").trim(),
          phone: String(addRegValues.phone ?? "").trim() || null,
          ntrp: String(addRegValues.ntrp ?? "").trim() || null,
          clubs: Array.isArray(addRegValues.clubs) ? addRegValues.clubs : [],
          playerId: addRegValues.playerId ? Number(addRegValues.playerId) : undefined,
          categories: selectedCategoryIds,
          partnerNames,
          partnerIds,
          nameOnEtransfer: String(addRegValues.nameOnEtransfer ?? "").trim() || null,
          photoVideoConsent: addRegValues.mediaConsent === "true",
          paymentReceived: addRegValues.paymentReceived === "true",
          notes: String(addRegValues.notes ?? "").trim() || null,
          adminComments: String(addRegValues.adminComments ?? "").trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Add failed");
      }
      setAddRegOpen(false);
      setAddRegValues({});
      refresh();
    } catch (err) {
      setAddRegErrors({ submit: err instanceof Error ? err.message : "Add failed" });
    } finally {
      setRegAddSaving(false);
    }
  }

  function openEditReg(r: RegistrationRow) {
    const vals: FormValues = {
      status: r.status,
      fullNameEn: r.playerNameEn,
      fullNameKo: r.playerNameKo ?? "",
      email: r.playerEmail,
      phone: r.playerPhone ?? "",
      ntrp: r.playerNtrp ?? "",
      gender: r.playerGender ?? "",
      clubs: r.playerClubs,
      playerId: String(r.playerId),
      categories: [r.categoryId],
      nameOnEtransfer: r.nameOnEtransfer ?? "",
      mediaConsent: r.photoVideoConsent ? "true" : "false",
      paymentReceived: r.paymentReceived ? "true" : "false",
      notes: r.notes ?? "",
      adminComments: r.adminComments ?? "",
    };
    if (r.isDoubles && r.partnerNameEn) {
      vals[`partner_${r.categoryId}`] = r.partnerNameEn;
      if (r.partnerId != null) vals[`partnerId_${r.categoryId}`] = String(r.partnerId);
    }
    setEditReg(r);
    setEditRegValues(vals);
    setEditRegErrors({});
  }

  const regYears = useMemo(
    () => [...new Set(registrations.map((r) => r.tournamentYear))].sort((a, b) => b - a),
    [registrations],
  );


  const regManagedFilters: ManagedFilterConfig<RegistrationRow>[] = [
    {
      type: "year",
      years: regYears,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
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
  ];

  const regView: TableViewConfig<RegistrationRow> = {
    type: "table",
    columns: [
      {
        header: a.teams.columns.number,
        renderCell: (_r, i, total) => ({ type: "number", value: total - i }),
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
            ? { type: "text", value: locale === "ko" ? (r.partnerNameKo ?? r.partnerNameEn) : r.partnerNameEn }
            : { type: "text", value: null },
      },
      {
        header: a.registrations.columns.payment,
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
            refresh();
          },
        }),
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
        header: a.registrations.columns.notes,
        sortKey: "notes",
        sortValue: (r) => r.notes ?? "",
        renderCell: (r) => ({
          type: "text",
          value: r.notes ? (r.notes.length > 40 ? r.notes.slice(0, 40) + "…" : r.notes) : null,
        }),
      },
      {
        header: a.registrations.columns.tumbler,
        sortKey: "tumbler",
        sortValue: (r) => (r.tournamentYear === 2026 ? giveaways.find((g) => g.playerId === r.playerId)?.optionId : undefined) ?? "",
        renderCell: (r) => {
          const optId = r.tournamentYear === 2026 ? giveaways.find((g) => g.playerId === r.playerId)?.optionId : undefined;
          return { type: "text", value: optId ? `Option ${optId}` : null };
        },
      },
    ],
    onRowClick: openEditReg,
  };

  // ─── Teams ────────────────────────────────────────────────────────────────
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Seed modal state
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedModalYear, setSeedModalYear] = useState<number>(currentYear);
  const [categoryStates, setCategoryStates] = useState<Record<string, CategorySeedState>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [seedSaving, setSeedSaving] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [sharedUrlParams] = useUrlParams(["year"] as const);
  const [teamCatParams] = useUrlParams(["cat"] as const);

  const activeCategoriesForSeedYear = useMemo(() => {
    const activeIds = new Set(
      categoryStatuses
        .filter((s) => s.tournamentYear === seedModalYear && s.status === "Active")
        .map((s) => s.categoryId)
    );
    return categories.filter((c) => activeIds.has(c.id));
  }, [categories, categoryStatuses, seedModalYear]);

  function initAllCategoryStates(year: number) {
    const activeStatuses = categoryStatuses.filter((s) => s.tournamentYear === year && s.status === "Active");
    const states: Record<string, CategorySeedState> = {};
    for (const s of activeStatuses) {
      const cat = categories.find((c) => c.id === s.categoryId);
      const prelimFormat = s.prelimFormat ?? cat?.prelimFormat;
      states[s.categoryId] = buildCategoryState(s.categoryId, year, teams, prelimFormat);
    }
    setCategoryStates(states);
    setOpenCats(new Set());
  }

  function openSeedModal() {
    const year = parseInt(sharedUrlParams.year) || currentYear;
    setSeedModalYear(year);
    initAllCategoryStates(year);
    setSeedOpen(true);
    setSeedError(null);
  }

  function onSeedYearChange(year: number) {
    setSeedModalYear(year);
    initAllCategoryStates(year);
  }

  function onSeedFormatChange(catId: string, format: string) {
    const catTeams = teams.filter((t) => t.tournamentYear === seedModalYear && t.categoryId === catId);
    const gc = deriveGroupCount(catTeams.length);
    setCategoryStates((prev) => ({
      ...prev,
      [catId]: format === "GROUP_ROUND_ROBIN"
        ? { format, groupCount: gc, groupAssignments: Array.from({ length: gc }, () => []), elimAssignments: [] }
        : format === "ELIMINATION"
        ? { format, groupCount: 0, groupAssignments: [], elimAssignments: Array.from({ length: catTeams.length }, () => "") }
        : { format, groupCount: 0, groupAssignments: [], elimAssignments: [] },
    }));
  }

  function onGroupCountChange(catId: string, n: number) {
    const clamped = Math.max(2, Math.min(4, n));
    setCategoryStates((prev) => {
      const cur = prev[catId];
      const ga = clamped > cur.groupAssignments.length
        ? [...cur.groupAssignments, ...Array.from({ length: clamped - cur.groupAssignments.length }, () => [])]
        : cur.groupAssignments.slice(0, clamped);
      return { ...prev, [catId]: { ...cur, groupCount: clamped, groupAssignments: ga } };
    });
  }

  function updateGroupAssignment(catId: string, groupIdx: number, ids: string[]) {
    setCategoryStates((prev) => {
      const cur = prev[catId];
      const ga = cur.groupAssignments.map((g, i) => (i === groupIdx ? ids : g));
      return { ...prev, [catId]: { ...cur, groupAssignments: ga } };
    });
  }

  function updateElimAssignment(catId: string, seedIdx: number, teamId: string) {
    setCategoryStates((prev) => {
      const cur = prev[catId];
      const ea = cur.elimAssignments.map((t, i) => (i === seedIdx ? teamId : t));
      return { ...prev, [catId]: { ...cur, elimAssignments: ea } };
    });
  }

  async function saveSeedTeams() {
    setSeedSaving(true); setSeedError(null);
    const results = await Promise.all(
      Object.entries(categoryStates).map(([catId, state]) => {
        const catTeams = teams.filter((t) => t.tournamentYear === seedModalYear && t.categoryId === catId);
        const seeds: { teamId: string; seed: string | null }[] = [];
        if (state.format === "GROUP_ROUND_ROBIN") {
          state.groupAssignments.forEach((teamIds, i) => {
            const letter = String.fromCharCode(65 + i);
            teamIds.forEach((id) => seeds.push({ teamId: id, seed: letter }));
          });
          catTeams.forEach((t) => {
            if (!seeds.find((s) => s.teamId === t.teamId)) seeds.push({ teamId: t.teamId, seed: null });
          });
        } else if (state.format === "ELIMINATION") {
          state.elimAssignments.forEach((id, i) => { if (id) seeds.push({ teamId: id, seed: String(i + 1) }); });
          catTeams.forEach((t) => {
            if (!seeds.find((s) => s.teamId === t.teamId)) seeds.push({ teamId: t.teamId, seed: null });
          });
        }
        return fetch("/api/teams/seed-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: seedModalYear, categoryId: catId, prelimFormat: state.format, seeds }),
        });
      })
    );
    setSeedSaving(false);
    if (results.some((r) => !r.ok)) { setSeedError("Save failed"); return; }
    setSeedOpen(false);
    refresh();
  }

  const teamYears = useMemo(
    () => [...new Set(teams.map((r) => r.tournamentYear))].sort((a, b) => b - a),
    [teams],
  );

  const teamManagedFilters: ManagedFilterConfig<TeamRow>[] = [
    {
      type: "year",
      years: teamYears,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
      clearParams: ["seed"],
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
      type: "seed",
      options: (prevItems) => {
        const seen = new Set<string>();
        for (const tm of prevItems) { if (tm.seed) seen.add(tm.seed); }
        return [...seen].sort();
      },
      apply: (items, seed) => (seed ? items.filter((r) => r.seed === seed) : items),
      allLabel: t.shared.labels.seed,
      visibleWhen: (v) => !!v.cat && categoryMap.get(v.cat)?.prelimFormat !== "ELIMINATION",
    },
  ];

  // ─── Matches ──────────────────────────────────────────────────────────────
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);
  const [matchValues, setMatchValues] = useState<FormValues>({});
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchSaveError, setMatchSaveError] = useState<string | null>(null);
  const [matchFieldErrors, setMatchFieldErrors] = useState<Record<string, string>>({});
  const [lastSavedMatchId, setLastSavedMatchId] = useState<string | null>(null);
  const [patchedMatches, setPatchedMatches] = useState<Map<string, Partial<MatchRow>>>(new Map());

  const displayMatches = useMemo(() => {
    const ROUND_ORDER: Record<string, number> = { PRE: 0, R32: 1, R16: 2, QF: 3, SF: 4, F: 5 };
    return matches
      .map((m) => patchedMatches.has(m.id) ? { ...m, ...patchedMatches.get(m.id) } : m)
      .sort((a, b) => {
        const ra = ROUND_ORDER[a.roundCode ?? ""] ?? 99;
        const rb = ROUND_ORDER[b.roundCode ?? ""] ?? 99;
        if (ra !== rb) return ra - rb;
        const sd = matchStatusSortOrder(a.matchStatus) - matchStatusSortOrder(b.matchStatus);
        if (sd !== 0) return sd;
        return (a.date ?? "").localeCompare(b.date ?? "");
      });
  }, [matches, patchedMatches]);
  const locationOptions = useMemo(
    () => [...new Set(matches.map((m) => m.location).filter((l): l is string => Boolean(l)))].sort(),
    [matches],
  );
  const matchYears = useMemo(
    () => [...new Set(matches.map((m) => m.tournamentYear))].sort((a, b) => b - a),
    [matches],
  );

  function openEditMatch(m: MatchRow) {
    const s1t1 = m.set1T1 ?? ""; const s1t2 = m.set1T2 ?? "";
    const s2t1 = m.set2T1 ?? ""; const s2t2 = m.set2T2 ?? "";
    const initial: FormValues = {
      isCancelled: /^cancell?ed$/i.test(m.matchStatus ?? "") ? "true" : "false",
      date: m.date ?? "", time: parseTimeToHHMM(m.time),
      location: m.location ?? "", comment: m.comment ?? "", ball: m.ball ?? "",
      set1T1: s1t1, set2T1: s2t1, set3T1: m.set3T1 ?? "",
      set1T2: s1t2, set2T2: s2t2, set3T2: m.set3T2 ?? "",
      team1Withdrawn: (s1t1 === "0" && s2t1 === "0" && s1t2 === "6" && s2t2 === "6") ? "true" : "false",
      team2Withdrawn: (s1t2 === "0" && s2t2 === "0" && s1t1 === "6" && s2t1 === "6") ? "true" : "false",
    };
    setEditMatch(m);
    setMatchValues(initial);
    setMatchSaveError(null);
    setMatchFieldErrors({});
  }

  function handleMatchChange(updates: Partial<FormValues>) {
    setMatchFieldErrors({});
    setMatchValues((prev) => {
      const next = { ...prev, ...updates };
      if (updates.team1Withdrawn === "true") {
        Object.assign(next, { team2Withdrawn: "false", set1T1: "0", set2T1: "0", set3T1: "", set1T2: "6", set2T2: "6", set3T2: "" });
      } else if (updates.team2Withdrawn === "true") {
        Object.assign(next, { team1Withdrawn: "false", set1T1: "6", set2T1: "6", set3T1: "", set1T2: "0", set2T2: "0", set3T2: "" });
      }
      return next;
    });
  }

  async function saveMatch() {
    if (!editMatch) return;
    const fieldErrors = validateMatchFields(matchValues);
    if (Object.keys(fieldErrors).length > 0) { setMatchFieldErrors(fieldErrors); return; }
    setMatchSaving(true); setMatchSaveError(null);
    const v = matchValues;
    const resolvedStatus = v.isCancelled === "true" ? "Cancelled" : deriveMatchStatus(v);
    const res = await fetch(`/api/matches/${editMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchStatus: resolvedStatus,
        date: String(v.date ?? "") || null,
        time: String(v.time ?? "") || null,
        location: String(v.location ?? "") || null,
        comment: String(v.comment ?? "") || null,
        ball: String(v.ball ?? "") || null,
        set1ScoreTeam1: String(v.set1T1 ?? "") || null,
        set2ScoreTeam1: String(v.set2T1 ?? "") || null,
        set3ScoreTeam1: String(v.set3T1 ?? "") || null,
        set1ScoreTeam2: String(v.set1T2 ?? "") || null,
        set2ScoreTeam2: String(v.set2T2 ?? "") || null,
        set3ScoreTeam2: String(v.set3T2 ?? "") || null,
      }),
    });
    setMatchSaving(false);
    if (!res.ok) { setMatchSaveError("Save failed"); return; }
    setPatchedMatches((prev) => new Map(prev).set(editMatch.id, {
      matchStatus: resolvedStatus,
      date: String(v.date ?? "") || null, time: String(v.time ?? "") || null,
      location: String(v.location ?? "") || null, comment: String(v.comment ?? "") || null,
      set1T1: String(v.set1T1 ?? "") || null, set2T1: String(v.set2T1 ?? "") || null, set3T1: String(v.set3T1 ?? "") || null,
      set1T2: String(v.set1T2 ?? "") || null, set2T2: String(v.set2T2 ?? "") || null, set3T2: String(v.set3T2 ?? "") || null,
      ball: String(v.ball ?? "") || null,
    }));
    setLastSavedMatchId(editMatch.id);
    setEditMatch(null);
    refresh();
  }

  const matchTeam1Label = editMatch
    ? editMatch.team1Names.map((en, i) => locale === "ko" ? editMatch.team1NamesKo[i]?.trim() || en : en).join(" / ") || a.matches.columns.team1
    : "";
  const matchTeam2Label = editMatch
    ? editMatch.team2Names.map((en, i) => locale === "ko" ? editMatch.team2NamesKo[i]?.trim() || en : en).join(" / ") || a.matches.columns.team2
    : "";

  const matchManagedFilters: ManagedFilterConfig<MatchRow>[] = [
    {
      type: "year",
      years: matchYears,
      apply: (items, year) => (year ? items.filter((m) => String(m.tournamentYear) === year) : items),
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
    },
  ];

  function buildMatchView(statusTab: string): TableViewConfig<MatchRow> {
    const showDateLocation = statusTab !== "Pending" && statusTab !== "Cancelled";
    const showSets = statusTab !== "Pending" && statusTab !== "Scheduled" && statusTab !== "Cancelled";
    return {
      type: "table",
      onRowClick: openEditMatch,
      getRowId: (m) => m.id,
      scrollToId: lastSavedMatchId,
      columns: [
        {
          header: a.matches.columns.matchId,
          sortKey: "matchId",
          sortValue: (m) => m.categoryId,
          renderCell: (m) => ({ type: "text", value: matchIdLabel(m) }),
        },
        {
          header: a.matches.columns.team1,
          sortKey: "team1",
          sortValue: (m) => m.team1Names.join(" / "),
          renderCell: (m) => {
            const winner = computeWinner({ set1ScoreTeam1: m.set1T1, set2ScoreTeam1: m.set2T1, set3ScoreTeam1: m.set3T1, set1ScoreTeam2: m.set1T2, set2ScoreTeam2: m.set2T2, set3ScoreTeam2: m.set3T2 });
            const names = (locale === "ko" ? m.team1Names.map((en, i) => m.team1NamesKo[i]?.trim() || en) : m.team1Names);
            return {
              type: "stack",
              lines: names.length > 0 ? names : [null],
              trailingIcon: winner === 1 ? CHECK_ICON : undefined,
              trailingIconPlaceholder: winner !== null,
            };
          },
        },
        {
          header: a.matches.columns.team2,
          sortKey: "team2",
          sortValue: (m) => m.team2Names.join(" / "),
          renderCell: (m) => {
            const winner = computeWinner({ set1ScoreTeam1: m.set1T1, set2ScoreTeam1: m.set2T1, set3ScoreTeam1: m.set3T1, set1ScoreTeam2: m.set1T2, set2ScoreTeam2: m.set2T2, set3ScoreTeam2: m.set3T2 });
            const names = (locale === "ko" ? m.team2Names.map((en, i) => m.team2NamesKo[i]?.trim() || en) : m.team2Names);
            return {
              type: "stack",
              lines: names.length > 0 ? names : [null],
              trailingIcon: winner === 2 ? CHECK_ICON : undefined,
              trailingIconPlaceholder: winner !== null,
            };
          },
        },
        ...(showDateLocation ? [{
          header: `${a.matches.modal.date} / ${a.matches.modal.location}`,
          renderCell: (m: MatchRow) => ({
            type: "stack" as const,
            lines: [
              formatDateDisplay(m.date, locale),
              m.time?.trim() ? formatTimeDisplay(m.time) : null,
              m.location ?? null,
            ],
          }),
        }] : []),
        ...(showSets ? [{
          header: a.matches.columns.sets,
          renderCell: (m: MatchRow) => ({
            type: "stack" as const,
            lines: [
              m.set1T1 != null && m.set1T2 != null ? `${m.set1T1}-${m.set1T2}` : null,
              m.set2T1 != null && m.set2T2 != null ? `${m.set2T1}-${m.set2T2}` : null,
              m.set3T1 != null && m.set3T2 != null ? `${m.set3T1}-${m.set3T2}` : null,
            ],
          }),
        }] : []),
        {
          header: t.shared.labels.status,
          sortKey: "status",
          sortValue: (m) => matchStatusSortOrder(m.matchStatus),
          renderCell: (m) => ({
            type: "chips",
            items: [{ label: matchStatusLabel(m.matchStatus, locale), className: matchStatusChipClass(m.matchStatus) }],
          }),
        },
      ],
    };
  }

  // ─── Ball ─────────────────────────────────────────────────────────────────
  const ballRows = useMemo(
    () => displayMatches
      .filter((m) => m.ball)
      .map((m) => ({
        id: m.id,
        tournamentYear: m.tournamentYear,
        playerName: m.ball!,
        matchId: m.id,
        categoryLabel: displayName(m.categoryLabel, m.categoryLabelKo, locale),
        team1Label: m.team1Names.length > 0
          ? m.team1Names.map((en, i) => displayName(en, m.team1NamesKo[i] ?? null, locale)).join(" / ")
          : null,
        team2Label: m.team2Names.length > 0
          ? m.team2Names.map((en, i) => displayName(en, m.team2NamesKo[i] ?? null, locale)).join(" / ")
          : null,
        received: m.ballReceived,
      }))
      .sort((a, b) => a.playerName.localeCompare(b.playerName)),
    [displayMatches, locale],
  );
  type BallRow = typeof ballRows[number];

  function toggleBallReceived(row: BallRow) {
    const next = !row.received;
    setPatchedMatches((prev) => new Map(prev).set(row.matchId, { ...prev.get(row.matchId), ballReceived: next }));
    fetch(`/api/matches/${row.matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ballReceived: next }),
    }).then(() => refresh());
  }

  const ballManagedFilters: ManagedFilterConfig<BallRow>[] = [
    {
      type: "year",
      years: matchYears,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
    },
  ];

  const ballView: TableViewConfig<BallRow> = {
    type: "table",
    columns: [
      {
        header: a.ball.columns.player,
        sortKey: "player",
        sortValue: (r) => r.playerName,
        width: "12ch",
        renderCell: (r) => ({ type: "text", value: r.playerName }),
      },
      {
        header: a.ball.columns.match,
        renderCell: (r) => ({ type: "stack", lines: [r.categoryLabel, r.team1Label, r.team2Label].filter(Boolean) }),
      },
      {
        header: a.ball.columns.received,
        width: "4rem",
        renderCell: (r) => ({
          type: "checkbox",
          checked: r.received,
          onToggle: (e) => { e.stopPropagation(); toggleBallReceived(r); },
        }),
      },
    ],
  };

  // ─── Players ──────────────────────────────────────────────────────────────
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);
  const [editPlayerValues, setEditPlayerValues] = useState<FormValues>(EMPTY_PLAYER);
  const [addPlayerValues, setAddPlayerValues] = useState<FormValues>(EMPTY_PLAYER);
  const [playerSaving, setPlayerSaving] = useState(false);
  const [playerSaveError, setPlayerSaveError] = useState<string | null>(null);
  const [playerDeleting, setPlayerDeleting] = useState(false);
  const [playerDeleteBlocked, setPlayerDeleteBlocked] = useState<string | null>(null);

  const finalistsSet = useMemo(() => new Set(finalists), [finalists]);
  const participationMap = useMemo(() => {
    const map = new Map<number, { year: number; categoryId: string; finalist: boolean }[]>();
    for (const r of registrations) {
      if (r.status === "Cancelled") continue;
      const finalist = finalistsSet.has(`${r.playerId}:${r.tournamentYear}:${r.categoryId}`);
      const entry = map.get(r.playerId) ?? [];
      entry.push({ year: r.tournamentYear, categoryId: r.categoryId, finalist });
      map.set(r.playerId, entry);
    }
    for (const [, entries] of map) entries.sort((a, b) => b.year - a.year || a.categoryId.localeCompare(b.categoryId));
    return map;
  }, [registrations, finalistsSet]);

  function openEditPlayer(p: PlayerRow) {
    setEditPlayer(p);
    setEditPlayerValues({ fullNameEn: p.fullNameEn, fullNameKo: p.fullNameKo ?? "", email: p.email, phone: p.phone ?? "", ntrp: p.ntrp ?? "", gender: p.gender ?? "", clubs: p.clubs });
    setPlayerSaveError(null);
  }

  async function savePlayer() {
    if (!editPlayer) return;
    setPlayerSaving(true); setPlayerSaveError(null);
    const res = await fetch(`/api/players/${editPlayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullNameEn: String(editPlayerValues.fullNameEn ?? ""),
        fullNameKo: String(editPlayerValues.fullNameKo ?? "") || null,
        email: String(editPlayerValues.email ?? ""),
        phone: String(editPlayerValues.phone ?? "") || null,
        ntrp: String(editPlayerValues.ntrp ?? "") || null,
        gender: String(editPlayerValues.gender ?? "") || null,
        clubs: Array.isArray(editPlayerValues.clubs) ? editPlayerValues.clubs : [],
      }),
    });
    setPlayerSaving(false);
    if (!res.ok) { setPlayerSaveError("Save failed"); return; }
    setEditPlayer(null); refresh();
  }

  async function deletePlayer() {
    if (!editPlayer) return;
    const regCount = registrations.filter((r) => r.playerId === editPlayer.id).length;
    if (regCount > 0) {
      setPlayerDeleteBlocked(
        `This player has ${regCount} registration${regCount === 1 ? "" : "s"} and cannot be deleted.`
      );
      return;
    }
    setPlayerDeleting(true); setPlayerSaveError(null);
    const res = await fetch(`/api/players/${editPlayer.id}`, { method: "DELETE" });
    setPlayerDeleting(false);
    if (!res.ok) {
      setPlayerSaveError("Delete failed");
      return;
    }
    setEditPlayer(null); refresh();
  }

  async function addPlayer() {
    setPlayerSaving(true); setPlayerSaveError(null);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullNameEn: String(addPlayerValues.fullNameEn ?? ""),
        fullNameKo: String(addPlayerValues.fullNameKo ?? "") || null,
        email: String(addPlayerValues.email ?? ""),
        phone: String(addPlayerValues.phone ?? "") || null,
        ntrp: String(addPlayerValues.ntrp ?? "") || null,
        gender: String(addPlayerValues.gender ?? "") || null,
        clubs: Array.isArray(addPlayerValues.clubs) ? addPlayerValues.clubs : [],
      }),
    });
    setPlayerSaving(false);
    if (!res.ok) { setPlayerSaveError("Add failed"); return; }
    setAddPlayerOpen(false); setAddPlayerValues(EMPTY_PLAYER); refresh();
  }

  const playerManagedFilters: ManagedFilterConfig<PlayerRow>[] = [
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter((p) =>
          p.fullNameEn.toLowerCase().includes(lower) ||
          (p.fullNameKo ?? "").toLowerCase().includes(lower) ||
          p.email.toLowerCase().includes(lower),
        );
      },
    },
  ];

  const playerView: ManagedCardViewConfig<PlayerRow> = {
    getKey: (p) => p.id,
    renderItem: (p) => (
      <PlayerCard player={p} tournaments={participationMap.get(p.id) ?? []} onClick={() => openEditPlayer(p)} />
    ),
    gridClass: "grid-cols-1 sm:grid-cols-2",
  };

  // ─── Categories ───────────────────────────────────────────────────────────
  const [editCat, setEditCat] = useState<CategoryRow | null>(null);
  const [catValues, setCatValues] = useState<FormValues>({});
  const [catSaving, setCatSaving] = useState(false);
  const [catSaveError, setCatSaveError] = useState<string | null>(null);

  const catYears = useMemo(() => {
    const set = new Set(categoryStatuses.map((s) => s.tournamentYear));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [categoryStatuses, currentYear]);

  const mergedCatRows: CategoryRow[] = useMemo(() => {
    const ORDER: Record<string, number> = { Active: 0, Pending: 1, Inactive: 2 };
    const teamCounts = new Map<string, number>();
    for (const tm of teams) {
      const key = `${tm.tournamentYear}::${tm.categoryId}`;
      teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
    }
    const regCounts = new Map<string, number>();
    for (const r of registrations) {
      const key = `${r.tournamentYear}::${r.categoryId}`;
      regCounts.set(key, (regCounts.get(key) ?? 0) + 1);
    }
    return catYears.flatMap((year) => {
      const statusMap = new Map(categoryStatuses.filter((s) => s.tournamentYear === year).map((s) => [s.categoryId, s.status]));
      return categories
        .map((cat) => {
          const status = statusMap.get(cat.id) ?? "Pending";
          const count = status === "Inactive"
            ? (regCounts.get(`${year}::${cat.id}`) ?? 0)
            : (teamCounts.get(`${year}::${cat.id}`) ?? 0);
          return { ...cat, status, year, regCount: count };
        })
        .sort((a, b) => (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1));
    });
  }, [categories, categoryStatuses, teams, registrations, catYears]);

  const categoryTeams = useMemo(
    () => editCat ? teams.filter((tm) => tm.tournamentYear === editCat.year && tm.categoryId === editCat.id) : [],
    [teams, editCat],
  );

  const categoryRegistrations = useMemo(
    () => editCat ? registrations.filter((r) => r.tournamentYear === editCat.year && r.categoryId === editCat.id) : [],
    [registrations, editCat],
  );

  function openEditCat(row: CategoryRow) {
    setEditCat(row);
    setCatValues({ status: row.status, prelimFormat: row.prelimFormat ?? derivePrelimFormat(row.regCount) });
    setCatSaveError(null);
  }

  async function saveCategory() {
    if (!editCat) return;
    setCatSaving(true); setCatSaveError(null);
    const [statusRes, formatRes] = await Promise.all([
      fetch(`/api/categoryStatus/${editCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: editCat.year, status: catValues.status }),
      }),
      fetch(`/api/categories/${editCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prelimFormat: catValues.prelimFormat || null }),
      }),
    ]);
    setCatSaving(false);
    if (!statusRes.ok || !formatRes.ok) { setCatSaveError("Save failed"); return; }
    setEditCat(null); refresh();
  }

  const catView: TableViewConfig<CategoryRow> = {
    type: "table",
    stableColumnLayout: false,
    columns: [
      {
        header: a.categories.columns.label,
        sortKey: "label",
        sortValue: (r) => r.label,
        renderCell: (r) => ({ type: "text", value: locale === "ko" ? (r.labelKo ?? r.label) : r.label }),
      },
      {
        header: a.categories.columns.teams,
        sortKey: "players",
        sortValue: (r) => r.regCount,
        renderCell: (r) => ({ type: "number", value: r.regCount }),
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
    onRowClick: openEditCat,
  };

  // ─── Prizes ───────────────────────────────────────────────────────────────
  const [editPrize, setEditPrize] = useState<PrizeDisplayRow | null>(null);
  const [prizeValues, setPrizeValues] = useState<FormValues>({});
  const [prizeSaving, setPrizeSaving] = useState(false);
  const [prizeSaveError, setPrizeSaveError] = useState<string | null>(null);

  const prizeYears = useMemo(
    () => [...new Set(prizes.map((p) => p.tournamentYear))].sort((a, b) => b - a),
    [prizes],
  );

  const prizeRows = useMemo(() => {
    const activeSet = new Set(categoryStatuses.filter((s) => s.status === "Active").map((s) => `${s.tournamentYear}:${s.categoryId}`));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const teamCountMap = new Map<string, number>();
    for (const t of teams) {
      const key = `${t.tournamentYear}:${t.categoryId}`;
      teamCountMap.set(key, (teamCountMap.get(key) ?? 0) + 1);
    }
    return prizes
      .filter((p) => activeSet.has(`${p.tournamentYear}:${p.categoryId}`))
      .map((p) => {
        const cat = catMap.get(p.categoryId);
        return {
          id: p.id,
          categoryId: p.categoryId,
          categoryLabel: cat?.label ?? p.categoryId,
          categoryLabelKo: cat?.labelKo ?? null,
          year: p.tournamentYear,
          teamCount: teamCountMap.get(`${p.tournamentYear}:${p.categoryId}`) ?? 0,
          first: p.first, second: p.second, third: p.third, fourth: p.fourth,
        };
      });
  }, [prizes, categories, teams, categoryStatuses]);

  function openEditPrize(row: PrizeDisplayRow) {
    setEditPrize(row);
    setPrizeValues({ first: String(row.first), second: String(row.second), third: String(row.third), fourth: String(row.fourth) });
    setPrizeSaveError(null);
  }

  async function savePrize() {
    if (!editPrize) return;
    setPrizeSaving(true); setPrizeSaveError(null);
    const amounts = {
      first:  parseInt(String(prizeValues.first  ?? "0"), 10) || 0,
      second: parseInt(String(prizeValues.second ?? "0"), 10) || 0,
      third:  parseInt(String(prizeValues.third  ?? "0"), 10) || 0,
      fourth: parseInt(String(prizeValues.fourth ?? "0"), 10) || 0,
    };
    const res = await fetch(`/api/prizes/${editPrize.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(amounts),
    });
    setPrizeSaving(false);
    if (!res.ok) { setPrizeSaveError(a.prizes.saveError); return; }
    setEditPrize(null); refresh();
  }

  const prizeManagedFilters: ManagedFilterConfig<PrizeDisplayRow>[] = [
    {
      type: "year" as const,
      years: prizeYears,
      apply: (items: PrizeDisplayRow[], year: string) => (year ? items.filter((r) => String(r.year) === year) : items),
    },
    {
      type: "category" as const,
      options: (prevItems) => {
        const seen = new Map<string, { id: string; label: string; labelKo: string | null }>();
        for (const r of prevItems) {
          if (!seen.has(r.categoryId)) seen.set(r.categoryId, { id: r.categoryId, label: r.categoryLabel, labelKo: r.categoryLabelKo });
        }
        return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
      },
      apply: (items: PrizeDisplayRow[], catId: string) => (catId ? items.filter((r) => r.categoryId === catId) : items),
      allLabel: t.shared.labels.allCategories,
    },
  ];

  const prizeView: TableViewConfig<PrizeDisplayRow> = {
    type: "table",
    stableColumnLayout: true,
    columnClass: [undefined, undefined, undefined, undefined, undefined, undefined, "border-l border-[var(--table-border-row)]"],
    columns: [
      {
        header: a.prizes.columns.category,
        sortKey: "category",
        sortValue: (r) => r.categoryLabel,
        renderCell: (r) => ({ type: "text", value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel }),
      },
      { header: a.prizes.columns.teams,  renderCell: (r) => ({ type: "number", value: r.teamCount }) },
      { header: a.prizes.columns.first,  renderCell: (r) => ({ type: "text", value: formatPrize(r.first) }) },
      { header: a.prizes.columns.second, renderCell: (r) => ({ type: "text", value: formatPrize(r.second) }) },
      { header: a.prizes.columns.third,  renderCell: (r) => ({ type: "text", value: formatPrize(r.third) }) },
      { header: a.prizes.columns.fourth, renderCell: (r) => ({ type: "text", value: formatPrize(r.fourth) }) },
      { header: a.prizes.columns.total,  renderCell: (r) => ({ type: "text", value: formatPrize(r.first + r.second + r.third + r.fourth) }) },
    ],
    onRowClick: openEditPrize,
  };

  // ─── Admin Users ──────────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editUserValues, setEditUserValues] = useState<FormValues>({});
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [userEditDeleting, setUserEditDeleting] = useState(false);
  const [userEditError, setUserEditError] = useState<string | null>(null);
  const [addUserValues, setAddUserValues] = useState<FormValues>({ email: "" });
  const [userAddSaving, setUserAddSaving] = useState(false);
  const [userAddError, setUserAddError] = useState<string | null>(null);

  function openEditUser(u: AdminUserRow) {
    setEditUser(u);
    setEditUserValues({ email: u.email, active: u.active ? "active" : "inactive" });
    setUserEditError(null);
  }

  async function saveAdminUser() {
    if (!editUser) return;
    setUserEditSaving(true); setUserEditError(null);
    const res = await fetch(`/api/admin-users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editUserValues.email, active: editUserValues.active === "active" }),
    });
    setUserEditSaving(false);
    if (!res.ok) { setUserEditError("Failed to save"); return; }
    setEditUser(null); refresh();
  }

  async function deleteAdminUser() {
    if (!editUser) return;
    setUserEditDeleting(true); setUserEditError(null);
    const res = await fetch(`/api/admin-users/${editUser.id}`, { method: "DELETE" });
    setUserEditDeleting(false);
    if (!res.ok) { setUserEditError("Failed to delete"); return; }
    setEditUser(null); refresh();
  }

  async function addAdminUser() {
    setUserAddSaving(true); setUserAddError(null);
    const res = await fetch("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(addUserValues.email ?? "") }),
    });
    setUserAddSaving(false);
    if (!res.ok) { setUserAddError("Failed to add admin user"); return; }
    setAddAdminOpen(false); setAddUserValues({ email: "" }); refresh();
  }

  const adminUserView: TableViewConfig<AdminUserRow> = {
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
          items: [{ label: u.active ? a.admins.activeLabel : a.admins.inactiveLabel, className: categoryStatusChipClass(u.active ? "Active" : "Inactive") }],
        }),
      },
    ],
    onRowClick: openEditUser,
  };

  // ─── Court Bookings ───────────────────────────────────────────────────────
  const [allBookings, setAllBookings] = useState<CourtBookingAdminRow[]>(courtBookings);
  const [bookingsLoaded, setBookingsLoaded] = useState(courtBookings.length > 0);

  useEffect(() => {
    if (bookingsLoaded) return;
    fetch("/api/court-bookings?admin=1")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllBookings(data); })
      .catch(() => {})
      .finally(() => setBookingsLoaded(true));
  }, [bookingsLoaded]);
  const [bookingDate, setBookingDate] = useState("");
  const [managingId, setManagingId] = useState<string | null>(null);
  const [courtValues, setCourtValues] = useState<FormValues>({});
  const [courtSaving, setCourtSaving] = useState(false);

  const courtEnabledDates = useMemo(() => new Set(allBookings.map((b) => b.date)), [allBookings]);

  function courtBookingDisplayStatus(r: { status: string; date: string | null; timeSlot: string }) {
    const effective = deriveCourtBookingStatus(r.status, r.date ?? "", r.timeSlot);
    const labels: Record<string, string> = {
      Available: cb.fields.courtAvailable,
      Booked: cb.fields.courtBooked,
      Completed: cb.fields.courtCompleted,
      Expired: cb.fields.courtExpired,
    };
    return { status: effective, label: labels[effective], className: `court-chip-${effective.toLowerCase()}` };
  }
  const COURT_BOOKING_STATUS_SORT_ORDER: Record<string, number> = { Booked: 0, Completed: 1, Available: 2, Expired: 3 };

  const courtTableRows = useMemo(
    () => allBookings
      .filter((b) => !bookingDate || b.date === bookingDate)
      .map((b) => ({
        id: b.id,
        date: b.date,
        courtName: b.court ? displayName(b.court.name, b.court.nameKo, locale) : b.courtId,
        timeSlot: b.court?.timeSlot ?? "",
        status: b.status,
        categoryLabel: displayName(
          b.match?.category?.label ?? b.team?.category?.label ?? "",
          b.match?.category?.labelKo ?? b.team?.category?.labelKo ?? null,
          locale,
        ),
        bookedByLabel: b.bookedByPlayer
          ? displayName(b.bookedByPlayer.fullNameEn, b.bookedByPlayer.fullNameKo, locale)
          : b.team
            ? displayName(b.team.member1.fullNameEn, b.team.member1.fullNameKo, locale)
            : "",
        team1Label: sideLabel(b.match?.team1 ?? null, locale),
        team2Label: sideLabel(b.match?.team2 ?? null, locale),
      }))
      .sort((a, b) => {
        const pastA = a.date && a.date < getToday() ? 1 : 0;
        const pastB = b.date && b.date < getToday() ? 1 : 0;
        if (pastA !== pastB) return pastA - pastB;
        return (a.date ?? "").localeCompare(b.date ?? "");
      }),
    [allBookings, bookingDate, locale],
  );

  const managingBooking = useMemo(() => allBookings.find((b) => b.id === managingId) ?? null, [allBookings, managingId]);

  function openManage(id: string) {
    const b = allBookings.find((x) => x.id === id);
    if (!b) return;
    setManagingId(id);
    setCourtValues({
      status: courtBookingDisplayStatus({ status: b.status, date: b.date, timeSlot: b.court?.timeSlot ?? "" }).status,
      matchLabel: matchDisplayLabel(b.match, locale) ?? "",
      matchId: b.match?.id ?? "",
      teamId: b.match?.myTeamId ?? b.match?.team1Id ?? "",
      team1Label: sideLabel(b.match?.team1 ?? null, locale) ?? "",
      team2Label: sideLabel(b.match?.team2 ?? null, locale) ?? "",
      notes: b.notes ?? "",
    });
  }

  function closeManage() { setManagingId(null); setCourtValues({}); }

  async function saveCourtBooking() {
    if (!managingId) return;
    setCourtSaving(true);
    const notes = String(courtValues.notes ?? "").trim() || null;
    const b = managingBooking!;
    const status = String(courtValues.status ?? b.status);
    const res = await fetch(`/api/court-bookings/${managingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, teamId: b.teamId ?? null, matchId: b.match?.id ?? null, notes }),
    });
    setCourtSaving(false);
    if (res.ok) {
      setAllBookings((prev) => prev.map((x) => x.id === managingId ? { ...x, status, notes } : x));
      closeManage(); refresh();
    }
  }

  async function cancelBooking() {
    if (!managingId) return;
    setCourtSaving(true);
    const res = await fetch(`/api/court-bookings/${managingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Available", teamId: null, matchId: null, notes: null }),
    });
    setCourtSaving(false);
    if (res.ok) {
      setAllBookings((prev) => prev.map((x) => x.id === managingId ? { ...x, status: "Available", teamId: null, matchId: null, notes: null, match: null, team: null, bookedByPlayer: null } : x));
      closeManage(); refresh();
    }
  }

  type CourtRow = typeof courtTableRows[number];
  function buildCourtView(statusTab: string): TableViewConfig<CourtRow> {
    const sortable = statusTab !== "All";
    const showTeamsAndBookedBy = statusTab !== "Available" && statusTab !== "Expired";
    const strip = <C extends { sortKey?: string; sortValue?: (r: CourtRow) => string | number }>(col: C): C =>
      sortable ? col : { ...col, sortKey: undefined, sortValue: undefined };
    return {
      type: "table",
      onRowClick: (r) => openManage(r.id),
      columns: [
        ...(!bookingDate ? [strip({
          header: a.courtBookings.dateLabel,
          sortKey: "date",
          sortValue: (r: CourtRow) => `${r.date && r.date >= getToday() ? "0" : "1"}-${r.date ?? ""}`,
          renderCell: (r: CourtRow) => ({ type: "text" as const, value: formatDateDisplay(r.date, locale) }),
        })] : []),
        strip({
          header: a.courtBookings.columns.court,
          sortKey: "court",
          sortValue: (r) => r.courtName,
          renderCell: (r) => ({ type: "stack" as const, lines: [r.courtName, r.timeSlot] }),
        }),
        ...(showTeamsAndBookedBy ? [{ header: a.courtBookings.columns.teams, renderCell: (r: CourtRow) => ({ type: "stack" as const, lines: [r.categoryLabel, r.team1Label, r.team2Label].filter(Boolean) }) }] : []),
        strip({
          header: a.courtBookings.columns.status,
          sortKey: "status",
          sortValue: (r) => COURT_BOOKING_STATUS_SORT_ORDER[courtBookingDisplayStatus(r).status],
          renderCell: (r) => {
            const { label, className } = courtBookingDisplayStatus(r);
            return { type: "chips" as const, items: [{ label, className }] };
          },
        }),
        ...(showTeamsAndBookedBy ? [{ header: a.courtBookings.columns.bookedBy, renderCell: (r: CourtRow) => ({ type: "text" as const, value: r.bookedByLabel }) }] : []),
      ],
    };
  }

  // ─── Tumblers ─────────────────────────────────────────────────────────────
  const [allGiveaways, setAllGiveaways] = useState<GiveawayRow[]>(giveaways);
  useEffect(() => { setAllGiveaways(giveaways); }, [giveaways]);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [editingGiveaway, setEditingGiveaway] = useState<GiveawayRow | null>(null);
  const [editValues, setEditValues] = useState<FormValues>({});
  const [editSaving, setEditSaving] = useState(false);

  const tumblerStockRows = useMemo(
    () => tumblerOptions.map((tumbler) => {
      const applicants = allGiveaways.filter(
        (g) => g.optionId === tumbler.optionId || g.optionId2 === tumbler.optionId,
      );
      const total = tumbler.stock;
      return {
        optionId: tumbler.optionId,
        optionLabel: tumbler.label,
        imageSrc: tumbler.imageSrc,
        count: applicants.length,
        total,
        available: applicants.length < total,
        applicants,
      };
    }),
    [allGiveaways, tumblerOptions],
  );

  type TumblerStockRow = typeof tumblerStockRows[number];

  const tumblerAsGiveawayOptions = useMemo(
    () => tumblerOptions.map((t) => ({
      optionId: t.optionId,
      label: t.label,
      imageSrc: t.imageSrc,
      status: "Available" as const,
    })),
    [tumblerOptions],
  );

  const activeTumbler = useMemo(
    () => tumblerStockRows.find((r) => r.optionId === activeOptionId) ?? null,
    [tumblerStockRows, activeOptionId],
  );

  function openEditGiveaway(r: GiveawayRow) {
    setEditingGiveaway(r);
    setEditValues({ optionId: r.optionId });
  }

  function closeEditGiveaway() {
    setEditingGiveaway(null);
    setEditValues({});
  }

  async function saveGiveaway() {
    if (!editingGiveaway) return;
    setEditSaving(true);
    await fetch(`/api/giveaway/2026/${editingGiveaway.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        optionId: String(editValues.optionId ?? ""),
      }),
    });
    setEditSaving(false);
    closeEditGiveaway();
    refresh();
  }

  // ─── Tab config ───────────────────────────────────────────────────────────

  const TABS = [
    { value: "registrations", label: a.tabs.registrations },
    { value: "teams",         label: a.tabs.teams },
    { value: "matches",       label: a.tabs.matches },
    { value: "courtBookings", label: a.tabs.courtBookings },
    { value: "ball",          label: a.tabs.ball },
    { value: "players",       label: a.tabs.players },
    { value: "categories",    label: a.tabs.categories },
    { value: "prizes",        label: a.tabs.prizes },
    { value: "tumblers",      label: a.tabs.tumblers },
    { value: "admins",        label: a.tabs.admins },
  ];

  function handleTabChange(v: string) {
    setTabParam("tab", v, { clear: ["year", "cat", "round", "seed", "status", "q", "club"] });
    setAddRegOpen(false); setAddPlayerOpen(false); setAddAdminOpen(false);
  }

  const titleActions: ReactNode =
    tab === "players" ? (
      <Button variant="secondary" size="small" onClick={() => setAddPlayerOpen(true)}>{a.actions.addPlayer}</Button>
    ) : tab === "admins" ? (
      <Button variant="secondary" size="small" onClick={() => setAddAdminOpen(true)}>{a.actions.addAdminUser}</Button>
    ) : tab === "teams" ? (
      <Button
        variant="secondary"
        size="small"
        onClick={openSeedModal}
        disabled={drawsPublished}
        title={drawsPublished ? a.teams.seedModal.locked : undefined}
      >
        {a.teams.seedModal.title}
      </Button>
    ) : undefined;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer title={a.title} titleActions={titleActions}>
      <TabList tabs={TABS} value={tab} onSelect={handleTabChange} className="mb-[var(--content-gap)]" />

      {tab === "registrations" && (
        <DatabaseLayout<RegistrationRow>
          data={registrations}
          managedFilters={regManagedFilters}
          emptyText={a.registrations.empty}
          loading={refreshing}
        >
          {(filteredRegistrations) => {
            const statusFiltered = regStatusTab === "All"
              ? filteredRegistrations
              : filteredRegistrations.filter((r) => r.status === regStatusTab);
            const rowLabel = locale === "ko" ? "등록" : (statusFiltered.length === 1 ? "registration" : "registrations");
            return (
              <>
                <Tabs
                  value={regStatusTab}
                  onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
                >
                  <TabsList>
                    {REGISTRATION_STATUS_TABS.map((s) => (
                      <TabsTrigger key={s} value={s}>
                        {s === "All" ? t.shared.labels.allStatuses : registrationStatusLabel(s, locale)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="mt-[var(--content-gap)]">
                  {statusFiltered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      {a.registrations.empty}
                    </div>
                  ) : (
                    <TableView<RegistrationRow> items={statusFiltered} {...regView} />
                  )}
                </div>
                <p className="mt-2 text-right text-xs text-[var(--color-text-tertiary)]">
                  {t.shared.labels.total} {statusFiltered.length} {rowLabel}
                </p>
              </>
            );
          }}
        </DatabaseLayout>
      )}

      {tab === "teams" && (
        <DatabaseLayout<TeamRow>
          data={teams}
          managedFilters={teamManagedFilters}
          emptyText={a.teams.empty}
          loading={refreshing}
          rowCountLabel={locale === "ko" ? ["팀", "팀"] : ["team", "teams"]}
        >
          {(filteredTeams: TeamRow[]) => {
            const isCatFiltered = !!teamCatParams.cat;
            const hasGroupData = filteredTeams.some((r) => r.seed);
            const sortedTeams = [...filteredTeams].sort((a, b) => {
              if (!isCatFiltered) {
                const aOrder = categoryMap.get(a.categoryId)?.sortOrder ?? 999;
                const bOrder = categoryMap.get(b.categoryId)?.sortOrder ?? 999;
                if (aOrder !== bOrder) return aOrder - bOrder;
              }
              if (hasGroupData) {
                const ga = a.seed ?? ""; const gb = b.seed ?? "";
                if (ga !== gb) return ga.localeCompare(gb);
              }
              return parseInt(a.teamId.match(/(\d+)$/)![1], 10) - parseInt(b.teamId.match(/(\d+)$/)![1], 10);
            });
            const hasDoubles = filteredTeams.some((r) => r.isDoubles);
            return (
              <TableView<TeamRow>
                type="table"
                items={sortedTeams}
                rowGroupBreakBefore={!isCatFiltered ? makeGroupBreakBefore(sortedTeams, (r) => r.categoryId) : undefined}
                columns={[
                  {
                    header: a.teams.columns.number,
                    ...(isCatFiltered
                      ? {
                          sortKey: "number",
                          sortValue: (r: TeamRow) => parseInt(r.teamId.match(/(\d+)$/)![1], 10),
                          renderCell: (r: TeamRow) => ({ type: "number" as const, value: parseInt(r.teamId.match(/(\d+)$/)![1], 10) }),
                        }
                      : {
                          renderCell: (_r: TeamRow, i: number) => ({ type: "number" as const, value: i + 1 }),
                        }),
                  },
                  ...(!isCatFiltered ? [{
                    header: t.shared.labels.category,
                    sortKey: "category",
                    sortValue: (r: TeamRow) => categoryMap.get(r.categoryId)?.sortOrder ?? 999,
                    renderCell: (r: TeamRow) => ({ type: "text" as const, value: locale === "ko" ? (r.categoryLabelKo ?? r.categoryLabel) : r.categoryLabel }),
                  }] : []),
                  {
                    header: a.teams.columns.player1,
                    sortKey: "player1",
                    sortValue: (r: TeamRow) => r.member1NameEn,
                    renderCell: (r: TeamRow) => ({ type: "text" as const, value: displayName(r.member1NameEn, r.member1NameKo, locale) }),
                  },
                  ...(hasDoubles ? [{
                    header: a.teams.columns.player2,
                    sortKey: "player2",
                    sortValue: (r: TeamRow) => r.member2NameEn ?? "",
                    renderCell: (r: TeamRow) => ({ type: "text" as const, value: r.member2NameEn ? displayName(r.member2NameEn, r.member2NameKo, locale) : null }),
                  }] : []),
                  ...(hasGroupData ? [{
                    header: t.shared.labels.seed,
                    sortKey: "seed",
                    sortValue: (r: TeamRow) => r.seed ?? "",
                    renderCell: (r: TeamRow) => r.seed
                      ? { type: "chips" as const, items: [{ label: r.seed, className: `group-chip-${r.seed.toLowerCase()}` }] }
                      : { type: "text" as const, value: null },
                  }] : []),
                ]}
              />
            );
          }}
        </DatabaseLayout>
      )}

      {tab === "matches" && (
        <DatabaseLayout<MatchRow>
          data={displayMatches}
          managedFilters={matchManagedFilters}
          emptyText={a.matches.empty}
          loading={refreshing}
        >
          {(filteredMatches) => {
            const statusFiltered = matchStatusTab === "All"
              ? filteredMatches
              : filteredMatches.filter((m) => m.matchStatus.toLowerCase() === matchStatusTab.toLowerCase());
            const rowLabel = locale === "ko" ? "경기" : (statusFiltered.length === 1 ? "match" : "matches");
            return (
              <>
                <Tabs
                  value={matchStatusTab}
                  onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
                >
                  <TabsList>
                    {MATCH_STATUS_TABS.map((s) => (
                      <TabsTrigger key={s} value={s}>
                        {s === "All" ? t.shared.labels.allStatuses : matchStatusLabel(s, locale)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="mt-[var(--content-gap)]">
                  {statusFiltered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      {a.matches.empty}
                    </div>
                  ) : (
                    <TableView<MatchRow> items={statusFiltered} {...buildMatchView(matchStatusTab)} />
                  )}
                </div>
                <p className="mt-2 text-right text-xs text-[var(--color-text-tertiary)]">
                  {t.shared.labels.total} {statusFiltered.length} {rowLabel}
                </p>
              </>
            );
          }}
        </DatabaseLayout>
      )}

      {tab === "ball" && (
        <DatabaseLayout<BallRow>
          data={ballRows}
          managedFilters={ballManagedFilters}
          view={ballView}
          emptyText={a.ball.empty}
          loading={refreshing}
          rowCountLabel={[a.ball.rowCountSingular, a.ball.rowCountPlural]}
        />
      )}

      {tab === "players" && (
        <DatabaseLayout<PlayerRow>
          data={players}
          managedFilters={playerManagedFilters}
          view={playerView}
          emptyText={a.players.empty}
          loading={refreshing}
        />
      )}

      {tab === "categories" && (
        <DatabaseLayout<CategoryRow>
          data={mergedCatRows}
          managedFilters={([
            { type: "year" as const, years: catYears, apply: (items: CategoryRow[], yr: string) => (yr ? items.filter((r) => String(r.year) === yr) : items) },
            {
              type: "status" as const,
              options: CATEGORY_YEAR_STATUSES.map((s) => ({ value: s, label: categoryStatusLabel(s, locale) })),
              apply: (items: CategoryRow[], status: string) => (status ? items.filter((r) => r.status === status) : items),
              allLabel: t.shared.labels.allStatuses,
            },
          ] satisfies ManagedFilterConfig<CategoryRow>[])}
          view={catView}
          emptyText={a.categories.empty}
          loading={refreshing}
          rowCountLabel={locale === "ko" ? ["카테고리", "카테고리"] : ["category", "categories"]}
        />
      )}

      {tab === "prizes" && (
        <DatabaseLayout<PrizeDisplayRow>
          data={prizeRows}
          managedFilters={prizeManagedFilters}
          emptyText={a.prizes.empty}
          loading={refreshing}
        >
          {(filteredData: PrizeDisplayRow[]) => {
            const totalPayout = filteredData.reduce((sum: number, r) => sum + r.first + r.second + r.third + r.fourth, 0);
            return (
              <div className="flex flex-col gap-2">
                <TableView<PrizeDisplayRow> items={filteredData} {...prizeView} />
                <p className="mt-2 text-right text-xs text-[var(--color-text-tertiary)]">
                  {locale === "ko" ? `총 상금: ${formatPrize(totalPayout)}` : `Total payout: ${formatPrize(totalPayout)}`}
                </p>
              </div>
            );
          }}
        </DatabaseLayout>
      )}

      {tab === "admins" && (
        <DatabaseLayout<AdminUserRow> data={adminUsers} view={adminUserView} emptyText={a.admins.empty} />
      )}

      {tab === "courtBookings" && (() => {
        const courtBookingStatusLabels: Record<string, string> = {
          Available: cb.fields.courtAvailable,
          Booked: cb.fields.courtBooked,
          Completed: cb.fields.courtCompleted,
          Expired: cb.fields.courtExpired,
        };
        const statusFilteredCourtRows = courtStatusTab === "All"
          ? courtTableRows
          : courtTableRows.filter((r) => courtBookingDisplayStatus(r).status === courtStatusTab);
        return (
          <DatabaseLayout
            isEmpty={statusFilteredCourtRows.length === 0}
            loading={!bookingsLoaded}
            emptyText={a.courtBookings.empty}
          >
            <Tabs
              value={courtStatusTab}
              onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
            >
              <TabsList>
                {COURT_BOOKING_STATUS_TABS.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s === "All" ? t.shared.labels.all : courtBookingStatusLabels[s]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-[var(--content-gap)]">
              <TableView<CourtRow> {...buildCourtView(courtStatusTab)} items={statusFilteredCourtRows} />
            </div>
          </DatabaseLayout>
        );
      })()}

      {tab === "tumblers" && (
        <DatabaseLayout
          isEmpty={tumblerStockRows.length === 0}
          emptyText={a.tumblers.noApplicants}
        >
          <TableView<TumblerStockRow>
            type="table"
            items={tumblerStockRows}
            onRowClick={(r) => setActiveOptionId(r.optionId)}
            columns={[
              {
                header: "#",
                width: "3ch",
                renderCell: (r) => ({ type: "number" as const, value: Number(r.optionId) }),
              },
              {
                header: a.tumblers.columns.tumbler,
                width: "5.5rem",
                renderCell: (r) => ({ type: "image" as const, src: r.imageSrc, size: "sm" }),
              },
              {
                header: a.tumblers.columns.stock,
                renderCell: (r) => ({ type: "text" as const, value: `${r.total - r.count} / ${r.total}` }),
              },
              {
                header: a.tumblers.columns.status,
                renderCell: (r) => ({
                  type: "chips" as const,
                  items: [r.available
                    ? { label: a.tumblers.statusAvailable, className: categoryStatusChipClass("Active") }
                    : { label: a.tumblers.statusFull, className: categoryStatusChipClass("Inactive") }],
                }),
              },
            ]}
          />
        </DatabaseLayout>
      )}

      {/* ══ Modals ══ */}

      {editReg && (
        <Modal
          key={editReg.id}
          open
          onClose={() => setEditReg(null)}
          title={a.registrations.modal.title}
          maxWidthClass="max-w-2xl"
          onDestructive={deleteRegistration}
          destructiveDisabled={regDeleting}
          destructiveLabel={a.actions.delete}
          secondaryAction={{ label: a.actions.cancel, onClick: () => setEditReg(null) }}
          primaryAction={{ label: regSaving ? a.actions.saving : a.actions.save, onClick: handleSaveEdit, disabled: regSaving }}
        >
          <EntityForm
            fields={editRegFields}
            values={editRegValues}
            onChange={(updates) => {
              setEditRegValues((prev) => ({ ...prev, ...updates }));
              setEditRegErrors((prev) => {
                const next = { ...prev };
                for (const k of Object.keys(updates)) delete next[k];
                return next;
              });
            }}
            errors={editRegErrors}
            idPrefix="reg-edit"
          />
        </Modal>
      )}

      <Modal
        open={addRegOpen}
        onClose={() => { setAddRegOpen(false); setAddRegValues({}); setAddRegErrors({}); }}
        title={a.registrations.modal.addTitle}
        maxWidthClass="max-w-2xl"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { setAddRegOpen(false); setAddRegValues({}); setAddRegErrors({}); } }}
        primaryAction={{ label: regAddSaving ? a.actions.adding : a.actions.add, onClick: handleSaveAdd, disabled: regAddSaving }}
      >
        <EntityForm
          fields={addRegFields}
          values={addRegValues}
          onChange={(updates) => {
            setAddRegValues((prev) => ({ ...prev, ...updates }));
            setAddRegErrors((prev) => {
              const next = { ...prev };
              for (const k of Object.keys(updates)) delete next[k];
              return next;
            });
          }}
          errors={addRegErrors}
          idPrefix="reg-add"
        />
      </Modal>

      <Modal
        open={seedOpen}
        onClose={() => setSeedOpen(false)}
        title={sm.title}
        maxWidthClass="max-w-2xl"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setSeedOpen(false) }}
        primaryAction={{
          label: seedSaving ? a.actions.generating : a.actions.saveAndGenerate,
          onClick: saveSeedTeams,
          disabled: seedSaving,
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Year */}
          <Field
            variant="select"
            id="seed-year"
            label={sm.year}
            value={String(seedModalYear)}
            onChange={(e) => onSeedYearChange(parseInt((e.target as HTMLSelectElement).value))}
          >
            {teamYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </Field>

          {/* Accordion of active categories — modal body handles scrolling */}
          <div className="rounded-lg overflow-hidden border border-[var(--color-border-ui)] divide-y divide-[var(--color-border-ui)]">
            {activeCategoriesForSeedYear.map((cat) => {
              const state = categoryStates[cat.id];
              if (!state) return null;
              const catTeams = teams.filter((t) => t.tournamentYear === seedModalYear && t.categoryId === cat.id);
              const catLabel = locale === "ko" ? cat.labelKo ?? cat.label : cat.label;
              return (
                <Collapsible
                  squared
                  key={cat.id}
                  open={openCats.has(cat.id)}
                  onToggle={() => setOpenCats((prev) => {
                    const n = new Set(prev);
                    n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id);
                    return n;
                  })}
                  title={
                    <span className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-[var(--color-text-primary)]">{catLabel}</span>
                      <span className="text-[var(--color-text-tertiary)]">{catTeams.length} {sm.teamsCount}</span>
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3 p-4">
                    {/* Format */}
                    <Field
                      variant="select"
                      id={`seed-fmt-${cat.id}`}
                      label={sm.prelimFormat}
                      value={state.format}
                      onChange={(e) => onSeedFormatChange(cat.id, (e.target as HTMLSelectElement).value)}
                    >
                      <option value="ROUND_ROBIN">{sm.roundRobin}</option>
                      <option value="GROUP_ROUND_ROBIN">{sm.groupRoundRobin}</option>
                      <option value="ELIMINATION">{sm.elimination}</option>
                    </Field>

                    {/* GROUP_ROUND_ROBIN */}
                    {state.format === "GROUP_ROUND_ROBIN" && (
                      <>
                        <Field
                          variant="number"
                          id={`seed-gc-${cat.id}`}
                          label={sm.numberOfGroups}
                          min={2}
                          max={4}
                          value={String(state.groupCount)}
                          onChange={(e) => onGroupCountChange(cat.id, parseInt((e.target as HTMLInputElement).value) || 2)}
                        />
                        {state.groupAssignments.map((groupTeamIds, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const assignedElsewhere = new Set(
                            state.groupAssignments.flatMap((g, j) => (j !== i ? g : []))
                          );
                          const selected = groupTeamIds.map((id) => toTeamOption(id, catTeams, locale as "en" | "ko"));
                          const available = catTeams
                            .filter((t) => !assignedElsewhere.has(t.teamId) && !groupTeamIds.includes(t.teamId))
                            .map((t) => toTeamOption(t.teamId, catTeams, locale as "en" | "ko"));
                          return (
                            <Field
                              key={i}
                              variant="multiselect"
                              id={`seed-grp-${cat.id}-${i}`}
                              label={`${sm.seedLabel} ${letter}`}
                              selected={selected}
                              available={available}
                              onChange={(ids) => updateGroupAssignment(cat.id, i, ids)}
                              placeholder={sm.selectTeamsPlaceholder}
                            />
                          );
                        })}
                      </>
                    )}

                    {/* ELIMINATION */}
                    {state.format === "ELIMINATION" && (
                      <div className="flex flex-col gap-2">
                        {state.elimAssignments.map((teamId, i) => {
                          const assignedElsewhere = new Set(state.elimAssignments.filter((_, j) => j !== i));
                          const selected = teamId ? [toTeamOption(teamId, catTeams, locale as "en" | "ko")] : [];
                          const available = catTeams
                            .filter((t) => !assignedElsewhere.has(t.teamId) && t.teamId !== teamId)
                            .map((t) => toTeamOption(t.teamId, catTeams, locale as "en" | "ko"));
                          return (
                            <Field
                              key={i}
                              variant="multiselect"
                              horizontal
                              id={`seed-elim-${cat.id}-${i}`}
                              label={`${sm.seedLabel} ${i + 1}`}
                              selected={selected}
                              available={available}
                              onChange={(ids) => updateElimAssignment(cat.id, i, ids[ids.length - 1] ?? "")}
                              placeholder={sm.selectTeamsPlaceholder}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>

          {seedError && <p className="text-sm text-[var(--color-error)]">{seedError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!editMatch}
        onClose={() => setEditMatch(null)}
        title={a.matches.modal.title}
        maxWidthClass="max-w-lg"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditMatch(null) }}
        primaryAction={{ label: matchSaving ? a.actions.saving : a.actions.save, onClick: saveMatch, disabled: matchSaving }}
      >
        {editMatch && (
          <EntityForm
            key={editMatch.id}
            fields={matchFields(t, locationOptions, matchTeam1Label, matchTeam2Label)}
            values={matchValues}
            onChange={handleMatchChange}
            error={matchSaveError}
            errors={matchFieldErrors}
            idPrefix="match-edit"
          />
        )}
      </Modal>

      <Modal
        open={!!editPlayer}
        onClose={() => setEditPlayer(null)}
        title={a.players.modal.editTitle}
        maxWidthClass="max-w-lg"
        onDestructive={deletePlayer}
        destructiveDisabled={playerDeleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditPlayer(null) }}
        primaryAction={{ label: playerSaving ? a.actions.saving : a.actions.save, onClick: savePlayer, disabled: playerSaving }}
      >
        {editPlayer && (
          <EntityForm
            fields={playerFields(t, { isAdmin: true })}
            values={editPlayerValues}
            onChange={(updates) => setEditPlayerValues((prev) => ({ ...prev, ...updates }))}
            error={playerSaveError}
            idPrefix="edit-player"
          />
        )}
      </Modal>

      <Modal
        open={!!playerDeleteBlocked}
        onClose={() => setPlayerDeleteBlocked(null)}
        title={a.players.modal.cannotDeleteTitle}
        maxWidthClass="max-w-sm"
        primaryAction={{ label: a.actions.close, onClick: () => setPlayerDeleteBlocked(null) }}
      >
        <p className="text-sm text-[var(--color-text-secondary)]">{playerDeleteBlocked}</p>
      </Modal>

      <Modal
        open={addPlayerOpen}
        onClose={() => { setAddPlayerOpen(false); setAddPlayerValues(EMPTY_PLAYER); }}
        title={a.players.modal.addTitle}
        maxWidthClass="max-w-lg"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { setAddPlayerOpen(false); setAddPlayerValues(EMPTY_PLAYER); } }}
        primaryAction={{ label: playerSaving ? a.actions.adding : a.actions.add, onClick: addPlayer, disabled: playerSaving || !String(addPlayerValues.fullNameEn ?? "").trim() }}
      >
        <EntityForm
          fields={playerFields(t, { isAdmin: true })}
          values={addPlayerValues}
          onChange={(updates) => setAddPlayerValues((prev) => ({ ...prev, ...updates }))}
          error={playerSaveError}
          idPrefix="add-player"
        />
      </Modal>

      <Modal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title={a.categories.modal.editTitle}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditCat(null) }}
        primaryAction={{ label: catSaving ? a.actions.saving : a.actions.save, onClick: saveCategory, disabled: catSaving }}
      >
        {editCat && (
          <EntityForm
            fields={categoryFields(t, locale, editCat.year)}
            values={catValues}
            onChange={(updates) => setCatValues((prev) => ({ ...prev, ...updates }))}
            error={catSaveError}
            idPrefix="cat-edit"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                {a.categories.modal.playersTitle}
              </p>
              {editCat.status === "Inactive" ? (
                categoryRegistrations.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)]">{a.categories.modal.noPlayers}</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {(() => {
                      if (!editCat.isDoubles) {
                        return categoryRegistrations.map((r) => (
                          <div key={r.id} className="text-sm">
                            {displayName(r.playerNameEn, r.playerNameKo, locale)}
                          </div>
                        ));
                      }
                      const seen = new Set<number>();
                      const pairs: RegistrationRow[] = [];
                      for (const r of categoryRegistrations) {
                        if (seen.has(r.playerId)) continue;
                        seen.add(r.playerId);
                        if (r.partnerId != null) seen.add(r.partnerId);
                        pairs.push(r);
                      }
                      return pairs.map((r) => (
                        <div key={r.id} className="text-sm">
                          {displayName(r.playerNameEn, r.playerNameKo, locale)}
                          {r.partnerNameEn && ` / ${displayName(r.partnerNameEn, r.partnerNameKo, locale)}`}
                        </div>
                      ));
                    })()}
                  </div>
                )
              ) : categoryTeams.length === 0 ? (
                <p className="text-sm text-[var(--color-text-tertiary)]">{a.categories.modal.noPlayers}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {categoryTeams.map((team) => {
                    const p1 = displayName(team.member1NameEn, team.member1NameKo, locale);
                    const p2 = team.member2NameEn ? displayName(team.member2NameEn, team.member2NameKo, locale) : null;
                    return <div key={team.teamId} className="text-sm">{p2 ? `${p1} / ${p2}` : p1}</div>;
                  })}
                </div>
              )}
            </div>
          </EntityForm>
        )}
      </Modal>

      <Modal
        open={!!editPrize}
        onClose={() => setEditPrize(null)}
        title={a.prizes.modal.title}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditPrize(null) }}
        primaryAction={{ label: prizeSaving ? a.actions.saving : a.actions.save, onClick: savePrize, disabled: prizeSaving }}
      >
        {editPrize && (
          <EntityForm
            fields={prizeFields(t)}
            values={prizeValues}
            onChange={(updates) => setPrizeValues((prev) => ({ ...prev, ...updates }))}
            error={prizeSaveError}
            idPrefix="prize-edit"
          >
            <p className="text-sm text-[var(--color-text-secondary)]">
              {locale === "ko" ? (editPrize.categoryLabelKo ?? editPrize.categoryLabel) : editPrize.categoryLabel}
              {" · "}
              {editPrize.teamCount} {a.prizes.teamsUnit}
            </p>
          </EntityForm>
        )}
      </Modal>

      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={a.admins.modal.editTitle}
        maxWidthClass="max-w-sm"
        onDestructive={deleteAdminUser}
        destructiveDisabled={userEditDeleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditUser(null) }}
        primaryAction={{ label: userEditSaving ? a.actions.saving : a.actions.save, onClick: saveAdminUser, disabled: userEditSaving || !String(editUserValues.email ?? "").trim() }}
      >
        <EntityForm
          fields={adminUserFields(t)}
          values={editUserValues}
          onChange={(updates) => setEditUserValues((prev) => ({ ...prev, ...updates }))}
          error={userEditError}
          idPrefix="admin-edit"
        />
      </Modal>

      <Modal
        open={addAdminOpen}
        onClose={() => { setAddAdminOpen(false); setAddUserValues({ email: "" }); }}
        title={a.admins.modal.addTitle}
        maxWidthClass="max-w-sm"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { setAddAdminOpen(false); setAddUserValues({ email: "" }); } }}
        primaryAction={{ label: userAddSaving ? a.actions.adding : a.actions.add, onClick: addAdminUser, disabled: userAddSaving || !String(addUserValues.email ?? "").trim() }}
      >
        <EntityForm
          fields={adminUserFields(t).slice(0, 1)}
          values={addUserValues}
          onChange={(updates) => setAddUserValues((prev) => ({ ...prev, ...updates }))}
          error={userAddError}
          idPrefix="admin-add"
        >
          <p className="text-xs text-[var(--color-text-tertiary)]">{a.admins.modal.note}</p>
        </EntityForm>
      </Modal>

      <Modal
        open={Boolean(managingId)}
        onClose={closeManage}
        title={a.courtBookings.manageTitle}
        maxWidthClass="max-w-lg"
        primaryAction={{ label: courtSaving ? a.actions.saving : a.actions.save, onClick: saveCourtBooking, disabled: courtSaving }}
        secondaryAction={{ label: a.actions.cancel, onClick: closeManage }}
        onDestructive={managingBooking?.status === "Booked" ? cancelBooking : undefined}
        destructiveLabel={a.courtBookings.cancelBookingLabel}
        destructiveDisabled={courtSaving}
      >
        {managingBooking && (
          <div className="flex flex-col gap-4">
            {/* Court + date header */}
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {managingBooking.court ? displayName(managingBooking.court.name, managingBooking.court.nameKo, locale) : managingBooking.courtId}
              {" · "}
              {formatDateDisplay(managingBooking.date, locale)}
              {managingBooking.court?.timeSlot ? ` · ${managingBooking.court.timeSlot}` : ""}
            </p>

            {/* 1. Status (editable) */}
            <Field
              variant="select"
              id="court-booking-status"
              label={a.courtBookings.columns.status}
              value={String(courtValues.status ?? managingBooking.status)}
              onChange={(e) => setCourtValues((prev) => ({ ...prev, status: (e.target as HTMLSelectElement).value }))}
            >
              <option value="Available">{cb.fields.courtAvailable}</option>
              <option value="Booked">{cb.fields.courtBooked}</option>
              <option value="Completed">{cb.fields.courtCompleted}</option>
              <option value="Expired">{cb.fields.courtExpired}</option>
            </Field>

            {/* 2. Linked match as ChoiceCard (read-only) */}
            {managingBooking.match && (() => {
              const m = managingBooking.match!;
              const t1 = sideLabel(m.team1, locale);
              const t2 = sideLabel(m.team2, locale);
              const cat = m.category ? displayName(m.category.label, m.category.labelKo, locale) : null;
              return (
                <div className="flex flex-col gap-1">
                  <span className="form-label">{a.courtBookings.matchLabel}</span>
                  <div className="rounded-lg border border-[var(--color-border-ui)] overflow-hidden">
                    <div className={cn(
                      "flex items-start gap-3 w-full px-4 py-3 text-left",
                      "bg-[var(--color-surface-muted)]",
                    )}>
                      <span className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--color-primary-blue-500)]" aria-hidden>
                        <span className="h-2 w-2 rounded-full bg-[var(--color-primary-blue-500)]" />
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{cat ?? "—"}</p>
                        {t1 && <p className="text-sm text-[var(--color-text-secondary)]">{t1}</p>}
                        {t2 && <p className="text-sm text-[var(--color-text-secondary)]">{t2}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Notes */}
            <Field
              variant="textarea"
              id="court-booking-notes"
              label={a.courtBookings.courtBookingNotesLabel}
              value={String(courtValues.notes ?? "")}
              onChange={(e) => setCourtValues((prev) => ({ ...prev, notes: (e.target as HTMLTextAreaElement).value }))}
              rows={2}
            />
          </div>
        )}
      </Modal>

      {activeTumbler && (
        <Modal
          open
          onClose={() => setActiveOptionId(null)}
          title={activeTumbler.optionLabel}
          closeLabel={a.actions.close}
          maxWidthClass="max-w-2xl"
        >
          {activeTumbler.applicants.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{a.tumblers.noApplicants}</p>
          ) : (
            <TableView<GiveawayRow>
              type="table"
              items={activeTumbler.applicants}
              onRowClick={openEditGiveaway}
              columns={[
                {
                  header: a.tumblers.columns.player,
                  sortKey: "player",
                  sortValue: (r) => r.playerNameEn,
                  renderCell: (r) => ({ type: "text" as const, value: displayName(r.playerNameEn, r.playerNameKo, locale) }),
                },
                {
                  header: a.tumblers.columns.received,
                  renderCell: (r) => {
                    const isSlot1 = r.optionId === activeOptionId;
                    const checked = isSlot1 ? r.received : r.received2;
                    const field = isSlot1 ? "received" : "received2";
                    return {
                      type: "checkbox" as const,
                      checked,
                      onToggle: (e) => {
                        e.stopPropagation();
                        setAllGiveaways((prev) =>
                          prev.map((g) => g.id === r.id ? { ...g, [field]: !checked } : g),
                        );
                        fetch(`/api/giveaway/2026/${r.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ [field]: !checked }),
                        }).then(() => refresh());
                      },
                    };
                  },
                },
              ]}
            />
          )}
        </Modal>
      )}

      {editingGiveaway && (
        <Modal
          open
          onClose={closeEditGiveaway}
          title={displayName(editingGiveaway.playerNameEn, editingGiveaway.playerNameKo, locale)}
          closeLabel={a.actions.cancel}
          primaryAction={{ label: editSaving ? a.actions.saving : a.actions.save, onClick: saveGiveaway, disabled: editSaving }}
          secondaryAction={{ label: a.actions.cancel, onClick: closeEditGiveaway }}
          maxWidthClass="max-w-md"
        >
          <EntityForm
            fields={giveawayFields(t, tumblerAsGiveawayOptions)}
            values={editValues}
            onChange={(updates) => setEditValues((prev) => ({ ...prev, ...updates }))}
            idPrefix="edit-giveaway"
          />
        </Modal>
      )}
    </PageContainer>
  );
}
