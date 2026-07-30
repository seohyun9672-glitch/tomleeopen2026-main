"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TableView } from "@/app/components/ui/table/Table";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { ADMIN_NAV } from "@/app/admin/adminNav";
import { AdminDashboard } from "@/app/admin/dashboard/AdminDashboard";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { DatabaseLayout, createSearchMatcher, EmptyState } from "@/app/components/database";
import { Modal } from "@/app/components/ui/Modal";
import { UploadPhotoModal } from "@/app/media/PhotoAlbumContent";
import { Button, IconButton } from "@/app/components/ui/Button";
import { Chip } from "@/app/components/ui/Chip";
import { ChoiceCard } from "@/app/components/ui/ChoiceCard";
import { X } from "lucide-react";
import { PageContainer } from "@/app/components/PageContainer";
import { EntityForm, type FormValues } from "@/app/components/forms";
import {
  playerFields, adminUserFields, categoryFields, prizeFields,
  matchFields, registrationFields, giveawayFields, mediaFields,
} from "@/lib/field-configs";
import { Collapsible } from "@/app/components/ui/Collapsible";
import { Field } from "@/app/components/ui/Field";
import { cn, getToday } from "@/lib/utils";
import { PlayerCard } from "@/app/components/PlayerCard";
import { registrationStatusChipClass, registrationStatusLabel, REGISTRATION_STATUSES } from "@/lib/registration";
import { formatDateDisplay, formatTimeDisplay, computeWinner, adminMatchStatusSortOrder, matchStatusLabel, matchStatusChipClass, matchSeqNumber, resolveBallPlayerName } from "@/lib/matches";
import {
  categoryStatusChipClass,
  categoryStatusLabel,
  CATEGORY_YEAR_STATUSES,
  deriveGroupedCategoryOptions,
} from "@/lib/categories";
import { derivePrelimFormat } from "@/lib/generateMatches";
import {
  type CategorySeedState,
  buildCategoryState,
  deriveGroupCount,
  toTeamOption,
} from "@/lib/seeding";
import { getYear, parseTimeToHHMM, formatPrize, makeGroupBreakBefore } from "@/lib/utils";
import { ROUND_PRE } from "@/lib/round";
import { deriveCourtBookingStatus } from "@/lib/content/courts";
import { useLocale } from "@/lib/locale-context";
import { displayName } from "@/lib/names";
import type { CategoryRecord } from "@/lib/categories";
import type { ManagedFilterConfig, ManagedCardViewConfig, ManagedYearFilterConfig, TableViewConfig } from "@/app/components/database";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

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
  roundSortOrder: number | null;
  group: string | null;
  team1Id: string | null;
  team2Id: string | null;
  team1Names: string[];
  team1NamesKo: string[];
  team2Names: string[];
  team2NamesKo: string[];
  team1Clubs: string[];
  team2Clubs: string[];
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

// ─── Media rows ───────────────────────────────────────────────────────────────

export type MediaRow = {
  id: string;
  type: string;
  title: string;
  titleKo: string | null;
  subtitle: string | null;
  subtitleKo: string | null;
  image: string | null;
  media: string | null;
  outlet: string | null;
  outletKo: string | null;
  date: string | null;
  categoryId: string | null;
  sortOrder: number;
  tournamentYear: number | null;
};

export type CommunityMediaCommentRow = {
  id: string;
  nickname: string;
  body: string;
  createdAt: string;
};

export type CommunityMediaPostRow = {
  id: string;
  title: string;
  nickname: string;
  imageUrl: string;
  createdAt: string;
  likeCount: number;
  viewCount: number;
  isAwardWinner: boolean;
  tournamentYear: number;
  commentCount: number;
  comments: CommunityMediaCommentRow[];
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
  mediaItems: MediaRow[];
  communityMediaPosts: CommunityMediaPostRow[];
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
  category: { id: string; label: string; labelKo: string | null } | null;
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
  team: { id: string; member1: BookingMember; member2: BookingMember | null; category: { id: string; label: string; labelKo: string | null } } | null;
  match: BookingMatch | null;
  bookedByPlayer: { fullNameEn: string; fullNameKo: string | null } | null;
};

// ─── Module-level helpers ─────────────────────────────────────────────────────

const MATCH_STATUS_TABS = ["All", "Pending", "Scheduled", "Completed", "Cancelled"];
const MATCH_QUICK_TABS = ["All", "Today", "Pending", "Scheduled", "Completed", "Cancelled"];
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
  mediaItems,
  communityMediaPosts,
}: AdminHubProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const cb = t.courtBookingPage;
  const sm = a.teams.seedModal;
  const currentYear = useMemo(() => getYear(), []);
  const [tabParams, setTabParam] = useUrlParams(["tab"] as const);
  const tab = tabParams["tab"] || "dashboard";
  const [matchStatusParams, setMatchStatusParam] = useUrlParams(["status"] as const);
  const matchStatusTab = MATCH_QUICK_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const courtStatusTab = COURT_BOOKING_STATUS_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const regStatusTab = REGISTRATION_STATUS_TABS.includes(matchStatusParams["status"])
    ? matchStatusParams["status"]
    : "All";
  const catStatusTab = CATEGORY_YEAR_STATUSES.includes(matchStatusParams["status"] as (typeof CATEGORY_YEAR_STATUSES)[number])
    ? matchStatusParams["status"]
    : "All";
  const [addRegOpen, setAddRegOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  function refresh() { startRefresh(() => { router.refresh(); }); }

  // Shared across all admin tables: the id of the row most recently saved via
  // an edit modal, so the table scrolls/highlights back to it instead of
  // resetting to the top when `refresh()` re-renders the list.
  const [lastSavedRowId, setLastSavedRowId] = useState<string | null>(null);

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

      setLastSavedRowId(editReg.id);
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
      param: "cat",
      options: (prevItems) => deriveGroupedCategoryOptions(prevItems.map((r) => r.categoryId), categoryMap),
      apply: (items, categoryId) => (categoryId ? items.filter((r) => r.categoryId === categoryId) : items),
      allLabel: t.shared.labels.allCategories,
    },
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter((r) =>
          r.playerNameEn.toLowerCase().includes(lower) ||
          (r.playerNameKo ?? "").toLowerCase().includes(lower) ||
          (r.partnerNameEn ?? "").toLowerCase().includes(lower) ||
          (r.partnerNameKo ?? "").toLowerCase().includes(lower),
        );
      },
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
    getRowId: (r) => r.id,
    scrollToId: lastSavedRowId,
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
  const [teamSeedParams, setTeamSeedParam] = useUrlParams(["seed"] as const);

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
      param: "cat",
      options: (prevItems) => deriveGroupedCategoryOptions(prevItems.map((r) => r.categoryId), categoryMap),
      apply: (items, categoryId) => (categoryId ? items.filter((r) => r.categoryId === categoryId) : items),
      allLabel: t.shared.labels.allCategories,
      clearParams: ["seed"],
    },
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter((r) =>
          r.member1NameEn.toLowerCase().includes(lower) ||
          (r.member1NameKo ?? "").toLowerCase().includes(lower) ||
          (r.member2NameEn ?? "").toLowerCase().includes(lower) ||
          (r.member2NameKo ?? "").toLowerCase().includes(lower),
        );
      },
    },
  ];

  // ─── Matches ──────────────────────────────────────────────────────────────
  const [editMatch, setEditMatch] = useState<MatchRow | null>(null);
  const [matchValues, setMatchValues] = useState<FormValues>({});
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchSaveError, setMatchSaveError] = useState<string | null>(null);
  const [matchFieldErrors, setMatchFieldErrors] = useState<Record<string, string>>({});
  const [patchedMatches, setPatchedMatches] = useState<Map<string, Partial<MatchRow>>>(new Map());

  const displayMatches = useMemo(() => {
    return matches
      .map((m) => patchedMatches.has(m.id) ? { ...m, ...patchedMatches.get(m.id) } : m)
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return (a.time ?? "").localeCompare(b.time ?? "");
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
      matchStatus: m.matchStatus ?? "Pending",
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
        // MatchCard only treats a 0-6/0-6 score as a walkover when the
        // match has no location/date/time — a scheduled match with that
        // score is a legitimately played result instead. Clear those so
        // the withdrawal actually displays as one.
        Object.assign(next, { team2Withdrawn: "false", set1T1: "0", set2T1: "0", set3T1: "", set1T2: "6", set2T2: "6", set3T2: "", date: "", time: "", location: "" });
      } else if (updates.team2Withdrawn === "true") {
        Object.assign(next, { team1Withdrawn: "false", set1T1: "6", set2T1: "6", set3T1: "", set1T2: "0", set2T2: "0", set3T2: "", date: "", time: "", location: "" });
      }
      if (updates.matchStatus === "Pending") {
        Object.assign(next, { date: "", time: "", location: "" });
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
    const resolvedStatus = v.matchStatus === "Cancelled" ? "Cancelled" : deriveMatchStatus(v);
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
    setLastSavedRowId(editMatch.id);
    if (matchStatusTab !== "All" && matchStatusTab !== "Today" && resolvedStatus.toLowerCase() !== matchStatusTab.toLowerCase()) {
      setMatchStatusParam("status", "");
    }
    setEditMatch(null);
    refresh();
  }

  const matchTeam1Label = editMatch
    ? editMatch.team1Names.map((en, i) => locale === "ko" ? editMatch.team1NamesKo[i]?.trim() || en : en).join(" / ") || a.matches.columns.team1
    : "";
  const matchTeam2Label = editMatch
    ? editMatch.team2Names.map((en, i) => locale === "ko" ? editMatch.team2NamesKo[i]?.trim() || en : en).join(" / ") || a.matches.columns.team2
    : "";
  // Ball select values are always the canonical English name (locale-invariant),
  // regardless of which locale is active when saving — the label is the only
  // part that changes with locale — so the Ball tab can re-translate the
  // stored value on display instead of it being frozen in whatever language
  // was on screen when the match was last saved.
  const matchBallOptions = editMatch
    ? [
        ...editMatch.team1Names.map((en, i) => ({ value: en, label: displayName(en, editMatch.team1NamesKo[i] ?? null, locale) })),
        ...editMatch.team2Names.map((en, i) => ({ value: en, label: displayName(en, editMatch.team2NamesKo[i] ?? null, locale) })),
      ].filter((o) => o.value)
    : [];

  const matchManagedFilters: ManagedFilterConfig<MatchRow>[] = [
    {
      type: "year",
      years: matchYears,
      apply: (items, year) => (year ? items.filter((m) => String(m.tournamentYear) === year) : items),
    },
    {
      type: "category",
      param: "cat",
      options: (prevItems) => deriveGroupedCategoryOptions(prevItems.map((m) => m.categoryId), categoryMap),
      apply: (items, categoryId) => (categoryId ? items.filter((m) => m.categoryId === categoryId) : items),
      allLabel: t.shared.labels.allCategories,
    },
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter((m) =>
          [...m.team1Names, ...m.team1NamesKo, ...m.team2Names, ...m.team2NamesKo].some((name) =>
            name.toLowerCase().includes(lower),
          ),
        );
      },
    },
  ];

  function buildMatchView(statusTab: string): TableViewConfig<MatchRow> {
    const showDateLocation = statusTab !== "Pending" && statusTab !== "Cancelled";
    const showSets = statusTab !== "Pending" && statusTab !== "Scheduled" && statusTab !== "Cancelled";
    return {
      type: "table",
      onRowClick: openEditMatch,
      getRowId: (m) => m.id,
      scrollToId: lastSavedRowId,
      columns: [
        {
          header: a.matches.columns.matchId,
          sortKey: "round",
          sortValue: (m) => m.roundSortOrder ?? 99,
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
          header: `${a.matches.modal.date} / ${a.matches.columns.time}`,
          sortKey: "date",
          sortValue: (m: MatchRow) => m.date ?? "",
          renderCell: (m: MatchRow) => ({
            type: "stack" as const,
            lines: [
              formatDateDisplay(m.date, locale),
              m.time?.trim() ? formatTimeDisplay(m.time) : null,
            ],
          }),
        }, {
          header: a.matches.columns.location,
          renderCell: (m: MatchRow) => ({ type: "text" as const, value: m.location ?? null }),
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
          sortValue: (m) => adminMatchStatusSortOrder(m.matchStatus),
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
        playerName: resolveBallPlayerName(m, locale),
        matchId: m.id,
        date: m.date,
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
    {
      type: "search",
      apply: (items, q) => {
        const lower = q.toLowerCase();
        return items.filter((r) => r.playerName.toLowerCase().includes(lower));
      },
    },
  ];

  const ballView: TableViewConfig<BallRow> = {
    type: "table",
    columnNoWrap: [true, false, false, false],
    columns: [
      {
        header: a.ball.columns.player,
        sortKey: "player",
        sortValue: (r) => r.playerName,
        renderCell: (r) => ({ type: "text", value: r.playerName }),
      },
      {
        header: a.ball.columns.date,
        sortKey: "date",
        sortValue: (r) => r.date ?? "",
        renderCell: (r) => ({ type: "text", value: formatDateDisplay(r.date, locale) }),
      },
      {
        header: a.ball.columns.match,
        renderCell: (r) => ({ type: "stack", lines: [r.categoryLabel, r.team1Label, r.team2Label].filter(Boolean) }),
      },
      {
        header: a.ball.columns.received,
        width: "4rem",
        sortKey: "received",
        sortValue: (r) => (r.received ? 1 : 0),
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

  const playerYears = useMemo(
    () => [...new Set(registrations.map((r) => r.tournamentYear))].sort((a, b) => b - a),
    [registrations],
  );

  const playerClubOptions = useMemo(
    () => [...new Set(players.flatMap((p) => p.clubs))].sort(),
    [players],
  );

  const playerManagedFilters: ManagedFilterConfig<PlayerRow>[] = [
    {
      type: "year",
      years: playerYears,
      apply: (items, year) => (year ? items.filter((p) => (participationMap.get(p.id) ?? []).some((e) => String(e.year) === year)) : items),
      allLabel: t.shared.labels.allYears,
      defaultToAll: true,
    },
    {
      type: "club",
      options: playerClubOptions,
      apply: (items, selected) => (selected.length ? items.filter((p) => p.clubs.some((c) => selected.includes(c))) : items),
    },
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

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.fullNameEn.localeCompare(b.fullNameEn)),
    [players],
  );

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
    setLastSavedRowId(editCat.id);
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
    getRowId: (r) => r.id,
    scrollToId: lastSavedRowId,
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
    setLastSavedRowId(editPrize.id);
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
      param: "cat",
      options: (prevItems) => deriveGroupedCategoryOptions(prevItems.map((r) => r.categoryId), categoryMap),
      apply: (items: PrizeDisplayRow[], categoryId: string) =>
        (categoryId ? items.filter((r) => r.categoryId === categoryId) : items),
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
    getRowId: (r) => String(r.id),
    scrollToId: lastSavedRowId,
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
  // `courtBookings` (server prop) is always `[]` — this data is loaded
  // entirely client-side below, so `router.refresh()` (used elsewhere as a
  // generic "reload from the server" after a save) does nothing for this
  // tab. `reloadBookings` is the actual refetch, called on mount and again
  // after any save/cancel so the table and a reopened manage modal reflect
  // newly linked match/team data instead of staying stale until a manual
  // page reload.
  const [allBookings, setAllBookings] = useState<CourtBookingAdminRow[]>(courtBookings);
  const [bookingsLoaded, setBookingsLoaded] = useState(courtBookings.length > 0);
  const reloadBookings = useCallback(() => {
    return fetch("/api/court-bookings?admin=1")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAllBookings(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (bookingsLoaded) return;
    reloadBookings().finally(() => setBookingsLoaded(true));
  }, [bookingsLoaded, reloadBookings]);
  const [courtDateParams] = useUrlParams(["date"] as const);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [courtValues, setCourtValues] = useState<FormValues>({});
  const [courtSaving, setCourtSaving] = useState(false);
  const [courtSaveError, setCourtSaveError] = useState<string | null>(null);
  const [matchSearchOpen, setMatchSearchOpen] = useState(false);
  // Separate from `courtValues.matchLabel` (the confirmed selection's cached
  // display text, sent nowhere — only matchId/teamId are persisted) — the
  // search box needs its own empty-starting query, since searching the full
  // "Category · Player A vs Player B" confirmed label can never match a
  // player name.
  const [matchSearchQuery, setMatchSearchQuery] = useState("");

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
      .map((b) => ({
        id: b.id,
        date: b.date,
        courtName: b.court ? displayName(b.court.name, b.court.nameKo, locale) : b.courtId,
        timeSlot: b.court?.timeSlot ?? "",
        status: b.status,
        categoryId: b.match?.category?.id ?? b.team?.category?.id ?? "",
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
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      }),
    [allBookings, locale],
  );

  const managingBooking = useMemo(() => allBookings.find((b) => b.id === managingId) ?? null, [allBookings, managingId]);

  function openManage(id: string) {
    const b = allBookings.find((x) => x.id === id);
    if (!b) return;
    setManagingId(id);
    setCourtSaveError(null);
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

  function closeManage() {
    setManagingId(null);
    setCourtValues({});
    setCourtSaveError(null);
    setMatchSearchOpen(false);
    setMatchSearchQuery("");
  }

  // Bookable candidates: this year's preliminary matches that haven't been
  // played yet — already loaded client-side in `matches` (no fetch), so
  // search filters instantly on every keystroke instead of round-tripping
  // to the server. A match becomes "Scheduled" as soon as it has any
  // date/court (e.g. from a prior booking), so most real bookable matches
  // are Scheduled rather than Pending — only Completed/Cancelled ones are
  // actually excluded here.
  const bookableMatches = useMemo(
    () => matches.filter((m) =>
      m.tournamentYear === currentYear &&
      m.roundCode === ROUND_PRE &&
      m.matchStatus !== "Completed" &&
      m.matchStatus !== "Cancelled"
    ),
    [matches, currentYear],
  );

  // NFC-normalized before comparing — Korean input can arrive decomposed
  // (combining jamo) depending on OS/IME/browser, which would otherwise
  // fail to `.includes()`-match DB text stored precomposed even when the
  // two strings are visually identical.
  function normalizeSearchText(s: string): string {
    return s.normalize("NFC").toLowerCase();
  }

  const matchSearchResults = useMemo(() => {
    const q = normalizeSearchText(matchSearchQuery.trim());
    if (q.length < 2) return [];
    return bookableMatches.filter((m) =>
      [...m.team1Names, ...m.team1NamesKo, ...m.team2Names, ...m.team2NamesKo].some((name) =>
        normalizeSearchText(name).includes(q)
      )
    );
  }, [bookableMatches, matchSearchQuery]);

  /** Which side of `m` matched the search query — falls back to team1 (e.g. when selected before typing). */
  function pickMatchTeamId(m: MatchRow, query: string): string | null {
    const q = normalizeSearchText(query.trim());
    const inTeam1 = [...m.team1Names, ...m.team1NamesKo].some((name) => normalizeSearchText(name).includes(q));
    return inTeam1 ? m.team1Id : (m.team2Id ?? m.team1Id);
  }

  function matchRowDisplayLabel(m: MatchRow): { label: string; sublabel: string } {
    const team1 = m.team1Names.map((en, i) => displayName(en, m.team1NamesKo[i] ?? null, locale)).join(" / ");
    const team2 = m.team2Names.map((en, i) => displayName(en, m.team2NamesKo[i] ?? null, locale)).join(" / ");
    return {
      label: displayName(m.categoryLabel, m.categoryLabelKo, locale),
      sublabel: [team1, team2].filter(Boolean).join(" vs "),
    };
  }

  async function saveCourtBooking() {
    if (!managingId) return;
    setCourtSaving(true);
    setCourtSaveError(null);
    const notes = String(courtValues.notes ?? "").trim() || null;
    const b = managingBooking!;
    const status = String(courtValues.status ?? b.status);
    const teamId = courtValues.teamId != null ? String(courtValues.teamId) || null : (b.teamId ?? null);
    const matchId = courtValues.matchId != null ? String(courtValues.matchId) || null : (b.match?.id ?? null);
    const res = await fetch(`/api/court-bookings/${managingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, teamId, matchId, notes }),
    });
    setCourtSaving(false);
    if (res.ok) {
      setAllBookings((prev) => prev.map((x) => x.id === managingId ? { ...x, status, notes } : x));
      setLastSavedRowId(managingId);
      closeManage(); refresh(); reloadBookings();
    } else {
      setCourtSaveError(a.courtBookings.saveError);
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
      setLastSavedRowId(managingId);
      closeManage(); refresh(); reloadBookings();
    }
  }

  type CourtRow = typeof courtTableRows[number];
  function buildCourtView(statusTab: string): TableViewConfig<CourtRow> {
    const showTeamsAndBookedBy = statusTab !== "Available" && statusTab !== "Expired";
    return {
      type: "table",
      onRowClick: (r) => openManage(r.id),
      getRowId: (r) => r.id,
      scrollToId: lastSavedRowId,
      columns: [
        ...(!courtDateParams["date"] ? [{
          header: a.courtBookings.dateLabel,
          sortKey: "date",
          sortValue: (r: CourtRow) => r.date ?? "9999-99-99",
          renderCell: (r: CourtRow) => ({ type: "text" as const, value: formatDateDisplay(r.date, locale) }),
        }] : []),
        {
          header: a.courtBookings.columns.court,
          sortKey: "court",
          sortValue: (r: CourtRow) => r.courtName,
          renderCell: (r: CourtRow) => ({ type: "stack" as const, lines: [r.courtName, r.timeSlot] }),
        },
        ...(showTeamsAndBookedBy ? [{ header: a.courtBookings.columns.teams, renderCell: (r: CourtRow) => ({ type: "stack" as const, lines: [r.categoryLabel, r.team1Label, r.team2Label].filter(Boolean) }) }] : []),
        {
          header: a.courtBookings.columns.status,
          sortKey: "status",
          sortValue: (r: CourtRow) => COURT_BOOKING_STATUS_SORT_ORDER[courtBookingDisplayStatus(r).status],
          renderCell: (r: CourtRow) => {
            const { label, className } = courtBookingDisplayStatus(r);
            return { type: "chips" as const, items: [{ label, className }] };
          },
        },
        ...(showTeamsAndBookedBy ? [{ header: a.courtBookings.columns.bookedBy, renderCell: (r: CourtRow) => ({ type: "text" as const, value: r.bookedByLabel }) }] : []),
      ],
    };
  }

  const courtManagedFilters: ManagedFilterConfig<CourtRow>[] = [
    {
      type: "category",
      options: (prevItems) => deriveGroupedCategoryOptions(prevItems.map((r) => r.categoryId), categoryMap),
      apply: (items, catId) => (catId ? items.filter((r) => r.categoryId === catId) : items),
      allLabel: t.shared.labels.allCategories,
    },
    {
      type: "date",
      enabledDates: courtEnabledDates,
      dateAccessor: (r) => r.date,
      apply: (items, date) => (date ? items.filter((r) => r.date === date) : items),
    },
  ];

  // ─── Tumblers ─────────────────────────────────────────────────────────────
  const [allGiveaways, setAllGiveaways] = useState<GiveawayRow[]>(giveaways);
  useEffect(() => { setAllGiveaways(giveaways); }, [giveaways]);
  const [giveawaySectionParams, setGiveawaySectionParam] = useUrlParams(["section"] as const);
  const [editingGiveaway, setEditingGiveaway] = useState<GiveawayRow | null>(null);
  const [editValues, setEditValues] = useState<FormValues>({});
  const [editSaving, setEditSaving] = useState(false);

  const giveawaySection = giveawaySectionParams["section"] === "selections" ? "selections" : "inventory";

  const giveawayYears = useMemo(
    () => [...new Set(allGiveaways.map((g) => g.tournamentYear))].sort((a, b) => b - a),
    [allGiveaways],
  );

  const optionLabelById = useMemo(
    () => new Map(tumblerOptions.map((t) => [t.optionId, t.label])),
    [tumblerOptions],
  );

  // One stock row per (year, tumbler option) — the "year" managed filter below
  // narrows this down to the selected year, keeping Inventory on the same
  // self-managed DatabaseLayout pattern as every other tab.
  const tumblerStockRowsAllYears = useMemo(
    () => giveawayYears.flatMap((year) => {
      const yearGiveaways = allGiveaways.filter((g) => g.tournamentYear === year);
      return tumblerOptions.map((tumbler) => {
        const applicants = yearGiveaways.filter(
          (g) => g.optionId === tumbler.optionId || g.optionId2 === tumbler.optionId,
        );
        const total = tumbler.stock;
        return {
          tournamentYear: year,
          optionId: tumbler.optionId,
          optionLabel: tumbler.label,
          imageSrc: tumbler.imageSrc,
          count: applicants.length,
          total,
          available: applicants.length < total,
        };
      });
    }),
    [allGiveaways, tumblerOptions, giveawayYears],
  );

  type TumblerStockRow = typeof tumblerStockRowsAllYears[number];

  const tumblerAsGiveawayOptions = useMemo(
    () => tumblerOptions.map((t) => ({
      optionId: t.optionId,
      label: t.label,
      imageSrc: t.imageSrc,
      status: "Available" as const,
    })),
    [tumblerOptions],
  );

  // One row per confirmed participant for the year — not just those who
  // already made a giveaway pick — left-joined with their selection (if
  // any), plus a second row when they picked a secondary option too. A
  // participant who hasn't submitted a choice yet still shows up, with
  // null option/received cells instead of being omitted entirely.
  const selectionRows = useMemo(() => {
    const giveawayByPlayerYear = new Map<string, GiveawayRow>();
    for (const g of allGiveaways) giveawayByPlayerYear.set(`${g.playerId}-${g.tournamentYear}`, g);

    const rows: {
      key: string;
      giveawayId: string | null;
      tournamentYear: number;
      playerNameEn: string;
      playerNameKo: string | null;
      optionId: string | null;
      optionLabel: string | null;
      received: boolean;
      field: "received" | "received2";
    }[] = [];

    const seen = new Set<string>();
    for (const r of registrations) {
      if (r.status !== "Confirmed") continue;
      const key = `${r.playerId}-${r.tournamentYear}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const g = giveawayByPlayerYear.get(key);
      rows.push({
        key,
        giveawayId: g?.id ?? null,
        tournamentYear: r.tournamentYear,
        playerNameEn: r.playerNameEn,
        playerNameKo: r.playerNameKo,
        optionId: g?.optionId ?? null,
        optionLabel: g ? (optionLabelById.get(g.optionId) ?? g.optionId) : null,
        received: g?.received ?? false,
        field: "received",
      });
      if (g?.optionId2) {
        rows.push({
          key: `${key}-2`,
          giveawayId: g.id,
          tournamentYear: r.tournamentYear,
          playerNameEn: r.playerNameEn,
          playerNameKo: r.playerNameKo,
          optionId: g.optionId2,
          optionLabel: optionLabelById.get(g.optionId2) ?? g.optionId2,
          received: g.received2,
          field: "received2",
        });
      }
    }
    return rows;
  }, [registrations, allGiveaways, optionLabelById]);

  type SelectionRow = typeof selectionRows[number];

  const giveawaySearchMatcher = useMemo(
    () => createSearchMatcher<SelectionRow>((r) => [r.playerNameEn, r.playerNameKo]),
    [],
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

  function tumblerYearFilter<T extends { tournamentYear: number }>(): ManagedYearFilterConfig<T> {
    return {
      type: "year",
      years: giveawayYears,
      apply: (items, year) => (year ? items.filter((r) => String(r.tournamentYear) === year) : items),
    };
  }

  const tumblerInventoryFilters: ManagedFilterConfig<TumblerStockRow>[] = [tumblerYearFilter<TumblerStockRow>()];

  const tumblerInventoryView: TableViewConfig<TumblerStockRow> = {
    type: "table",
    columns: [
      { header: "#", width: "3ch", sortKey: "option", sortValue: (r) => Number(r.optionId), renderCell: (r) => ({ type: "number", value: Number(r.optionId) }) },
      { header: a.tumblers.columns.tumbler, width: "5.5rem", renderCell: (r) => ({ type: "image", src: r.imageSrc, size: "sm" }) },
      { header: a.tumblers.columns.stock, sortKey: "stock", sortValue: (r) => r.total - r.count, renderCell: (r) => ({ type: "text", value: `${r.total - r.count} / ${r.total}` }) },
      {
        header: a.tumblers.columns.status,
        sortKey: "status",
        sortValue: (r) => (r.available ? 0 : 1),
        renderCell: (r) => ({
          type: "chips",
          items: [r.available
            ? { label: a.tumblers.statusAvailable, className: categoryStatusChipClass("Active") }
            : { label: a.tumblers.statusFull, className: categoryStatusChipClass("Inactive") }],
        }),
      },
    ],
  };

  const selectionManagedFilters: ManagedFilterConfig<SelectionRow>[] = [
    tumblerYearFilter<SelectionRow>(),
    {
      type: "club",
      param: "option",
      options: tumblerOptions.map((o) => o.label),
      placeholder: a.tumblers.optionFilterPlaceholder,
      unitLabel: a.tumblers.optionFilterUnitLabel,
      singleSelect: true,
      apply: (items, selected) => (selected.length === 0 ? items : items.filter((r) => r.optionLabel != null && selected.includes(r.optionLabel))),
    },
    {
      type: "search",
      apply: (items, q) => giveawaySearchMatcher(items, q),
    },
  ];

  const selectionView: TableViewConfig<SelectionRow> = {
    type: "table",
    onRowClick: (r) => {
      const g = r.giveawayId ? allGiveaways.find((x) => x.id === r.giveawayId) : undefined;
      if (g) openEditGiveaway(g);
    },
    columns: [
      {
        header: a.tumblers.columns.player,
        sortKey: "player",
        sortValue: (r) => r.playerNameEn,
        renderCell: (r) => ({ type: "text", value: displayName(r.playerNameEn, r.playerNameKo, locale) }),
      },
      {
        header: a.tumblers.columns.tumblerChoice,
        sortKey: "option",
        sortValue: (r) => r.optionLabel ?? "",
        renderCell: (r) => ({ type: "text", value: r.optionLabel }),
      },
      {
        header: a.tumblers.columns.received,
        sortKey: "received",
        sortValue: (r) => (r.received ? 1 : 0),
        renderCell: (r) => {
          if (!r.giveawayId) return { type: "text", value: null };
          const giveawayId = r.giveawayId;
          return {
            type: "checkbox",
            checked: r.received,
            onToggle: (e) => {
              e.stopPropagation();
              setAllGiveaways((prev) =>
                prev.map((g) => g.id === giveawayId ? { ...g, [r.field]: !r.received } : g),
              );
              fetch(`/api/giveaway/2026/${giveawayId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [r.field]: !r.received }),
              }).then(() => refresh());
            },
          };
        },
      },
    ],
  };

  // ─── Media (Articles/Videos/Photos + Photo Album) ─────────────────────────

  const MEDIA_SUB_TABS = ["articles", "videos", "photos", "photoAlbum"] as const;
  type MediaSubTab = (typeof MEDIA_SUB_TABS)[number];
  const [mediaSubTab, setMediaSubTab] = useState<MediaSubTab>("articles");

  const EMPTY_MEDIA: FormValues = {
    title: "", titleKo: "", subtitle: "", subtitleKo: "", image: "", media: "",
    outlet: "", outletKo: "", date: "", categoryId: "", sortOrder: "0", tournamentYear: "",
  };

  const [editMedia, setEditMedia] = useState<MediaRow | null>(null);
  const [editMediaValues, setEditMediaValues] = useState<FormValues>(EMPTY_MEDIA);
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [addMediaValues, setAddMediaValues] = useState<FormValues>(EMPTY_MEDIA);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaSaveError, setMediaSaveError] = useState<string | null>(null);
  const [mediaDeleting, setMediaDeleting] = useState(false);

  function mediaRowToValues(m: MediaRow): FormValues {
    return {
      title: m.title, titleKo: m.titleKo ?? "", subtitle: m.subtitle ?? "", subtitleKo: m.subtitleKo ?? "",
      image: m.image ?? "", media: m.media ?? "", outlet: m.outlet ?? "", outletKo: m.outletKo ?? "",
      date: m.date ? m.date.slice(0, 10) : "", categoryId: m.categoryId ?? "",
      sortOrder: String(m.sortOrder ?? 0), tournamentYear: m.tournamentYear ? String(m.tournamentYear) : "",
    };
  }

  function mediaValuesToBody(v: FormValues) {
    return {
      title: String(v.title ?? ""),
      titleKo: String(v.titleKo ?? "") || null,
      subtitle: String(v.subtitle ?? "") || null,
      subtitleKo: String(v.subtitleKo ?? "") || null,
      image: String(v.image ?? "") || null,
      media: String(v.media ?? "") || null,
      outlet: String(v.outlet ?? "") || null,
      outletKo: String(v.outletKo ?? "") || null,
      date: String(v.date ?? "") || null,
      categoryId: String(v.categoryId ?? "") || null,
      sortOrder: Number(v.sortOrder) || 0,
      tournamentYear: v.tournamentYear ? Number(v.tournamentYear) : null,
    };
  }

  function openEditMedia(m: MediaRow) {
    setEditMedia(m);
    setEditMediaValues(mediaRowToValues(m));
    setMediaSaveError(null);
  }

  async function saveMedia() {
    if (!editMedia) return;
    setMediaSaving(true); setMediaSaveError(null);
    const res = await fetch(`/api/media/${editMedia.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mediaValuesToBody(editMediaValues)),
    });
    setMediaSaving(false);
    if (!res.ok) { setMediaSaveError("Save failed"); return; }
    setEditMedia(null); refresh();
  }

  async function deleteMedia() {
    if (!editMedia) return;
    setMediaDeleting(true); setMediaSaveError(null);
    const res = await fetch(`/api/media/${editMedia.id}`, { method: "DELETE" });
    setMediaDeleting(false);
    if (!res.ok) { setMediaSaveError("Delete failed"); return; }
    setEditMedia(null); refresh();
  }

  async function addMedia() {
    setMediaSaving(true); setMediaSaveError(null);
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaSubTab, ...mediaValuesToBody(addMediaValues) }),
    });
    setMediaSaving(false);
    if (!res.ok) { setMediaSaveError("Add failed"); return; }
    setAddMediaOpen(false); setAddMediaValues(EMPTY_MEDIA); refresh();
  }

  function buildMediaView(): TableViewConfig<MediaRow> {
    return {
      type: "table",
      onRowClick: openEditMedia,
      columns: [
        {
          header: a.media.columns.image,
          renderCell: (m) => ({ type: "image", src: m.image ?? undefined, alt: m.title, size: "sm" }),
        },
        {
          header: a.media.columns.title,
          sortKey: "title",
          sortValue: (m) => m.title,
          renderCell: (m) => ({ type: "stack", lines: [m.title, m.outlet ?? null] }),
        },
        {
          header: a.media.columns.date,
          renderCell: (m) => ({ type: "text", value: m.date ? m.date.slice(0, 10) : "—" }),
        },
      ],
    };
  }

  const mediaRowsForTab = useMemo(
    () => mediaItems.filter((m) => m.type === mediaSubTab),
    [mediaItems, mediaSubTab],
  );

  // ─── Photo Album (community submissions) ───────────────────────────────────

  const [viewingPost, setViewingPost] = useState<CommunityMediaPostRow | null>(null);
  const [postTitleValue, setPostTitleValue] = useState("");
  const [postNicknameValue, setPostNicknameValue] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postDeleting, setPostDeleting] = useState(false);
  const [addPostOpen, setAddPostOpen] = useState(false);

  function openViewingPost(p: CommunityMediaPostRow) {
    setViewingPost(p);
    setPostTitleValue(p.title);
    setPostNicknameValue(p.nickname);
  }

  async function savePost() {
    if (!viewingPost) return;
    setPostSaving(true);
    const res = await fetch(`/api/community-media/${viewingPost.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: postTitleValue.trim(), nickname: postNicknameValue.trim() }),
    });
    setPostSaving(false);
    if (res.ok) {
      setViewingPost(null);
      refresh();
    }
  }

  async function deletePost() {
    if (!viewingPost) return;
    setPostDeleting(true);
    const res = await fetch(`/api/community-media/${viewingPost.id}`, { method: "DELETE" });
    setPostDeleting(false);
    if (res.ok) { setViewingPost(null); refresh(); }
  }

  const photoAlbumView: TableViewConfig<CommunityMediaPostRow> = {
    type: "table",
    onRowClick: openViewingPost,
    columns: [
      {
        header: a.media.columns.image,
        renderCell: (p) => ({ type: "image", src: p.imageUrl, alt: p.title, size: "sm" }),
      },
      {
        header: a.media.columns.nickname,
        renderCell: (p) => ({ type: "text", value: p.nickname }),
      },
      {
        header: a.media.columns.caption,
        renderCell: (p) => ({ type: "text", value: p.title }),
      },
      {
        header: a.media.columns.views,
        sortKey: "viewCount",
        sortValue: (p) => p.viewCount,
        renderCell: (p) => ({ type: "number", value: p.viewCount }),
      },
      {
        header: a.media.columns.likes,
        sortKey: "likeCount",
        sortValue: (p) => p.likeCount,
        renderCell: (p) => ({ type: "number", value: p.likeCount }),
      },
    ],
  };

  // ─── Tab config ───────────────────────────────────────────────────────────

  const navGroups = useMemo(() => ADMIN_NAV.map((g) => ({
    label: g.groupKey ? a.navGroups[g.groupKey] : null,
    items: g.items.map((value) => ({ value, label: a.tabs[value as keyof typeof a.tabs] })),
  })), [a]);

  function handleTabChange(v: string) {
    setTabParam("tab", v, { clear: ["year", "cat", "round", "seed", "status", "q", "club", "date"] });
    setAddRegOpen(false); setAddPlayerOpen(false); setAddAdminOpen(false); setAddMediaOpen(false);
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
    ) : tab === "media" ? (
      <Button variant="secondary" size="small" onClick={() => setAddPostOpen(true)}>{a.actions.addPhoto}</Button>
    ) : undefined;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer title={a.title} titleActions={titleActions} fillViewport>
      <div className="flex flex-1 min-h-0 flex-col gap-[var(--content-gap)] md:flex-row md:items-stretch">
      <AdminSidebar
        groups={navGroups}
        value={tab}
        onSelect={handleTabChange}
      />
      <div className="min-w-0 flex-1 flex flex-col gap-[var(--content-gap)] min-h-0 overflow-y-auto">

      {tab === "dashboard" && (
        <AdminDashboard matches={matches} teams={teams} registrations={registrations} categories={categories} />
      )}

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
              <div className="flex flex-col gap-[var(--content-gap)]">
                <Tabs
                  value={regStatusTab}
                  onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
                  className="shrink-0"
                >
                  <TabsList>
                    {REGISTRATION_STATUS_TABS.map((s) => (
                      <TabsTrigger key={s} value={s}>
                        {s === "All" ? t.shared.labels.allStatuses : registrationStatusLabel(s, locale)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div>
                  {statusFiltered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      {a.registrations.empty}
                    </div>
                  ) : (
                    <TableView<RegistrationRow> items={statusFiltered} {...regView} />
                  )}
                </div>
                <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                  {t.shared.labels.total} {statusFiltered.length} {rowLabel}
                </p>
              </div>
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
        >
          {(filteredTeams: TeamRow[]) => {
            const isCatFiltered = !!teamCatParams.cat;
            const resolvedCategoryId = teamCatParams.cat;
            const seedOptions = [...new Set(filteredTeams.map((r) => r.seed).filter((s): s is string => !!s))].sort();
            const showSeedTabs = isCatFiltered && categoryMap.get(resolvedCategoryId ?? "")?.prelimFormat !== "ELIMINATION" && seedOptions.length > 0;
            const seedTab = showSeedTabs && seedOptions.includes(teamSeedParams.seed) ? teamSeedParams.seed : "All";
            const seedFilteredTeams = seedTab === "All" ? filteredTeams : filteredTeams.filter((r) => r.seed === seedTab);
            const hasGroupData = seedFilteredTeams.some((r) => r.seed);
            const sortedTeams = [...seedFilteredTeams].sort((a, b) => {
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
            const hasDoubles = seedFilteredTeams.some((r) => r.isDoubles);
            return (
              <div className="flex flex-col gap-[var(--content-gap)]">
                {showSeedTabs && (
                  <Tabs value={seedTab} onValueChange={(v) => setTeamSeedParam("seed", v === "All" ? "" : v)} className="shrink-0">
                    <TabsList>
                      <TabsTrigger value="All">{t.shared.labels.all}</TabsTrigger>
                      {seedOptions.map((s) => (
                        <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
                <div>
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
                </div>
                <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                  {t.shared.labels.total} {sortedTeams.length} {locale === "ko" ? "팀" : (sortedTeams.length === 1 ? "team" : "teams")}
                </p>
              </div>
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
              : matchStatusTab === "Today"
                ? filteredMatches.filter((m) => m.date === getToday())
                : filteredMatches.filter((m) => m.matchStatus.toLowerCase() === matchStatusTab.toLowerCase());
            const rowLabel = locale === "ko" ? "경기" : (statusFiltered.length === 1 ? "match" : "matches");
            return (
              <div className="flex flex-col gap-[var(--content-gap)]">
                <Tabs
                  value={matchStatusTab}
                  onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
                  className="shrink-0"
                >
                  <TabsList>
                    {MATCH_QUICK_TABS.map((s) => (
                      <TabsTrigger key={s} value={s}>
                        {s === "All" ? t.shared.labels.allStatuses : s === "Today" ? t.shared.labels.today : matchStatusLabel(s, locale)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div>
                  {statusFiltered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[color:var(--color-border-ui-strong)] p-8 text-center text-sm text-[var(--color-text-tertiary)]">
                      {a.matches.empty}
                    </div>
                  ) : (
                    <TableView<MatchRow> items={statusFiltered} {...buildMatchView(matchStatusTab)} />
                  )}
                </div>
                <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                  {t.shared.labels.total} {statusFiltered.length} {rowLabel}
                </p>
              </div>
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
          data={sortedPlayers}
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
          ] satisfies ManagedFilterConfig<CategoryRow>[])}
          emptyText={a.categories.empty}
          loading={refreshing}
        >
          {(filteredCatRows) => {
            const statusFilteredCatRows = catStatusTab === "All"
              ? filteredCatRows
              : filteredCatRows.filter((r) => r.status === catStatusTab);
            const catCountLabel = locale === "ko" ? "카테고리" : (statusFilteredCatRows.length === 1 ? "category" : "categories");
            return (
              <div className="flex flex-col gap-[var(--content-gap)]">
                <Tabs value={catStatusTab} onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)} className="shrink-0">
                  <TabsList>
                    <TabsTrigger value="All">{t.shared.labels.all}</TabsTrigger>
                    {CATEGORY_YEAR_STATUSES.map((s) => (
                      <TabsTrigger key={s} value={s}>{categoryStatusLabel(s, locale)}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                {statusFilteredCatRows.length === 0 ? (
                  <EmptyState text={a.categories.empty} />
                ) : (
                  <>
                    <div>
                      <TableView<CategoryRow> {...catView} items={statusFilteredCatRows} />
                    </div>
                    <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
                      {t.shared.labels.total} {statusFilteredCatRows.length} {catCountLabel}
                    </p>
                  </>
                )}
              </div>
            );
          }}
        </DatabaseLayout>
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
                <div>
                  <TableView<PrizeDisplayRow> items={filteredData} {...prizeView} />
                </div>
                <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
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

      {tab === "media" && (
        <div className="flex flex-col gap-[var(--content-gap)]">
          <DatabaseLayout<CommunityMediaPostRow>
            data={communityMediaPosts}
            view={photoAlbumView}
            emptyText={a.media.empty}
          />
        </div>
      )}

      {tab === "courtBookings" && (() => {
        const courtBookingStatusLabels: Record<string, string> = {
          Available: cb.fields.courtAvailable,
          Booked: cb.fields.courtBooked,
          Completed: cb.fields.courtCompleted,
          Expired: cb.fields.courtExpired,
        };
        return (
          <DatabaseLayout<CourtRow>
            data={courtTableRows}
            managedFilters={courtManagedFilters}
            emptyText={a.courtBookings.empty}
            loading={!bookingsLoaded}
          >
            {(filteredCourtRows) => {
              const statusFilteredCourtRows = courtStatusTab === "All"
                ? filteredCourtRows
                : filteredCourtRows.filter((r) => courtBookingDisplayStatus(r).status === courtStatusTab);
              return (
                <div className="flex flex-col gap-[var(--content-gap)]">
                  <Tabs
                    value={courtStatusTab}
                    onValueChange={(v) => setMatchStatusParam("status", v === "All" ? "" : v)}
                    className="shrink-0"
                  >
                    <TabsList>
                      {COURT_BOOKING_STATUS_TABS.map((s) => (
                        <TabsTrigger key={s} value={s}>
                          {s === "All" ? t.shared.labels.all : courtBookingStatusLabels[s]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div>
                    {statusFilteredCourtRows.length === 0 ? (
                      <EmptyState text={a.courtBookings.empty} />
                    ) : (
                      <TableView<CourtRow> {...buildCourtView(courtStatusTab)} items={statusFilteredCourtRows} />
                    )}
                  </div>
                </div>
              );
            }}
          </DatabaseLayout>
        );
      })()}

      {tab === "tumblers" && (
        <div className="flex flex-col gap-[var(--content-gap)]">
          <Tabs
            value={giveawaySection}
            onValueChange={(v) => setGiveawaySectionParam("section", v === "inventory" ? "" : v)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="inventory">{a.tumblers.inventoryTab}</TabsTrigger>
              <TabsTrigger value="selections">{a.tumblers.selectionsTab}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            {giveawaySection === "inventory" ? (
              <DatabaseLayout<TumblerStockRow>
                data={tumblerStockRowsAllYears}
                managedFilters={tumblerInventoryFilters}
                emptyText={a.tumblers.noApplicants}
                view={tumblerInventoryView}
              />
            ) : (
              <DatabaseLayout<SelectionRow>
                data={selectionRows}
                managedFilters={selectionManagedFilters}
                emptyText={a.tumblers.noApplicants}
                view={selectionView}
              />
            )}
          </div>
        </div>
      )}

      </div>
      </div>

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
            fields={matchFields(t, locationOptions, matchTeam1Label, matchTeam2Label, matchBallOptions, locale)}
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
        open={!!editMedia}
        onClose={() => setEditMedia(null)}
        title={a.media.modal.editTitle}
        maxWidthClass="max-w-lg"
        onDestructive={deleteMedia}
        destructiveDisabled={mediaDeleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setEditMedia(null) }}
        primaryAction={{ label: mediaSaving ? a.actions.saving : a.actions.save, onClick: saveMedia, disabled: mediaSaving }}
      >
        {editMedia && (
          <EntityForm
            fields={mediaFields(t, categories)}
            values={editMediaValues}
            onChange={(updates) => setEditMediaValues((prev) => ({ ...prev, ...updates }))}
            error={mediaSaveError}
            idPrefix="edit-media"
          />
        )}
      </Modal>

      <Modal
        open={addMediaOpen}
        onClose={() => { setAddMediaOpen(false); setAddMediaValues(EMPTY_MEDIA); }}
        title={a.media.modal.addTitle}
        maxWidthClass="max-w-lg"
        secondaryAction={{ label: a.actions.cancel, onClick: () => { setAddMediaOpen(false); setAddMediaValues(EMPTY_MEDIA); } }}
        primaryAction={{ label: mediaSaving ? a.actions.adding : a.actions.add, onClick: addMedia, disabled: mediaSaving || !String(addMediaValues.title ?? "").trim() }}
      >
        <EntityForm
          fields={mediaFields(t, categories)}
          values={addMediaValues}
          onChange={(updates) => setAddMediaValues((prev) => ({ ...prev, ...updates }))}
          error={mediaSaveError}
          idPrefix="add-media"
        />
      </Modal>

      <Modal
        open={!!viewingPost}
        onClose={() => setViewingPost(null)}
        title={a.media.modal.photoAlbumTitle}
        maxWidthClass="max-w-2xl"
        onDestructive={deletePost}
        destructiveDisabled={postDeleting}
        destructiveLabel={a.actions.delete}
        secondaryAction={{ label: a.actions.cancel, onClick: () => setViewingPost(null) }}
        primaryAction={{ label: postSaving ? a.actions.saving : a.actions.save, onClick: savePost, disabled: postSaving || !postTitleValue.trim() || !postNicknameValue.trim() }}
      >
        {viewingPost && (
          <div className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewingPost.imageUrl} alt={viewingPost.title} className="w-full rounded-lg object-cover" />
            <div className="flex flex-col gap-3">
              <Field
                variant="text"
                id="edit-post-caption"
                label={a.media.columns.caption}
                required
                value={postTitleValue}
                onChange={(e) => setPostTitleValue(e.target.value)}
              />
              <Field
                variant="text"
                id="edit-post-nickname"
                label={a.media.columns.nickname}
                required
                value={postNicknameValue}
                onChange={(e) => setPostNicknameValue(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      <UploadPhotoModal
        open={addPostOpen}
        onClose={() => setAddPostOpen(false)}
        onUploaded={() => refresh()}
        t={t.mediaPage.photoAlbum}
      />

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
        description={managingBooking && (
          <>
            {managingBooking.court ? displayName(managingBooking.court.name, managingBooking.court.nameKo, locale) : managingBooking.courtId}
            {" · "}
            {formatDateDisplay(managingBooking.date, locale)}
            {managingBooking.court?.timeSlot ? ` · ${managingBooking.court.timeSlot}` : ""}
          </>
        )}
        maxWidthClass="max-w-lg"
        primaryAction={{ label: courtSaving ? a.actions.saving : a.actions.save, onClick: saveCourtBooking, disabled: courtSaving }}
        secondaryAction={{ label: a.actions.cancel, onClick: closeManage }}
        onDestructive={managingBooking?.status === "Booked" ? cancelBooking : undefined}
        destructiveLabel={a.courtBookings.cancelBookingLabel}
        destructiveDisabled={courtSaving}
      >
        {managingBooking && (() => {
          const isManagingBookingExpired = String(courtValues.status ?? managingBooking.status) === "Expired";
          return (
          <div className="flex flex-col gap-4">
            {/* 1. Status (editable) — a chip select: each option uses the
                same `court-chip-*` color variables as the read-only status
                badges elsewhere (table rows, booking chip), so the picked
                color always matches what's shown once saved. */}
            <div className="flex flex-col gap-1.5">
              <span className="form-label">{a.courtBookings.columns.status}</span>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: "Available", label: cb.fields.courtAvailable },
                  { value: "Booked", label: cb.fields.courtBooked },
                  { value: "Completed", label: cb.fields.courtCompleted },
                  { value: "Expired", label: cb.fields.courtExpired },
                ] as const).map((s) => {
                  const selected = String(courtValues.status ?? managingBooking.status) === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCourtValues((prev) => ({ ...prev, status: s.value }))}
                      className="cursor-pointer"
                    >
                      <Chip
                        label={s.label}
                        shape="rounded"
                        className={selected ? `court-chip-${s.value.toLowerCase()}` : "opacity-45 hover:opacity-70"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Linked match — search by player name among this year's
                not-yet-played preliminary matches, reassign to any of them.
                Expired bookings are read-only, so this field is hidden
                entirely rather than shown disabled. Shows either the
                confirmed match as a ChoiceCard summary (with a clear button
                to unlink and search again), or — while actively searching —
                a search box + scrollable ChoiceCard results (search runs
                client-side against already-loaded data, so it filters
                instantly on every keystroke). */}
            {!isManagingBookingExpired && (
            <div className="flex flex-col gap-1.5">
              <span className="form-label">{a.courtBookings.matchLabel}</span>
              {!matchSearchOpen && courtValues.matchId ? (
                // Currently linked match, shown as a ChoiceCard summary (not
                // just plain text) — click it to search for a different one.
                (() => {
                  const [summaryLabel, ...summaryRest] = String(courtValues.matchLabel ?? "").split(" · ");
                  return (
                    <div className="relative rounded-lg border border-[var(--color-border-ui)] overflow-hidden">
                      <ChoiceCard
                        label={summaryLabel}
                        sublabel={summaryRest.join(" · ")}
                        showImage={false}
                        selected
                        onClick={() => { setMatchSearchQuery(""); setMatchSearchOpen(true); }}
                      />
                      <button
                        type="button"
                        aria-label={a.actions.cancel}
                        onClick={() => {
                          setCourtValues((prev) => ({ ...prev, matchId: "", teamId: "", matchLabel: "" }));
                          setMatchSearchQuery("");
                          setMatchSearchOpen(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  );
                })()
              ) : (
                <>
                  <Field
                    variant="text"
                    id="court-booking-match"
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    onFocus={() => setMatchSearchOpen(true)}
                    autoFocus={matchSearchOpen}
                    autoComplete="off"
                    placeholder={a.courtBookings.searchMatchPlaceholder}
                  />
                  {matchSearchQuery.trim().length >= 2 && (
                    matchSearchResults.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-tertiary)]">{a.courtBookings.searchMatchEmpty}</p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--color-border-ui)]">
                        {matchSearchResults.map((m, i) => {
                          const { label, sublabel } = matchRowDisplayLabel(m);
                          return (
                            <div key={m.id} className={i > 0 ? "border-t border-[var(--color-border-ui)]" : ""}>
                              <ChoiceCard
                                label={label}
                                sublabel={sublabel}
                                showImage={false}
                                selected={courtValues.matchId === m.id}
                                onClick={() => {
                                  setCourtValues((prev) => ({
                                    ...prev,
                                    // Linking a match implies the slot is booked — the PATCH
                                    // endpoint only syncs the match's date/court onto the Match
                                    // row (i.e. actually schedules it) when status isn't
                                    // "Available", so leaving a previously-Available slot's
                                    // status untouched here would silently skip that sync.
                                    status: "Booked",
                                    matchId: m.id,
                                    teamId: pickMatchTeamId(m, matchSearchQuery) ?? "",
                                    matchLabel: `${label} · ${sublabel}`,
                                  }));
                                  setMatchSearchOpen(false);
                                  setMatchSearchQuery("");
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
            )}

            {/* 3. Notes */}
            <Field
              variant="textarea"
              id="court-booking-notes"
              label={a.courtBookings.courtBookingNotesLabel}
              value={String(courtValues.notes ?? "")}
              onChange={(e) => setCourtValues((prev) => ({ ...prev, notes: (e.target as HTMLTextAreaElement).value }))}
              rows={2}
            />

            {courtSaveError && <p className="form-field-error">{courtSaveError}</p>}
          </div>
          );
        })()}
      </Modal>

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
