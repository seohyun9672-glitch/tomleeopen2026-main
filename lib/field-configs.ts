import type { Messages } from "@/lib/content";
import type { FieldConfig, FormValues, MultiselectOption } from "@/app/components/forms";
import { clubChipClass } from "@/lib/clubs";

import { CATEGORY_YEAR_STATUSES, categoryStatusLabel, categoryChipClass } from "@/lib/categories";
import type { CategoryRecord } from "@/lib/categories";
import { displayName } from "@/lib/names";
import { REGISTRATION_STATUSES, registrationStatusLabel, registrationStatusChipClass } from "@/lib/registration";
import { fuzzyScore } from "@/lib/fuzzySearch";

// ─── Shared fields ────────────────────────────────────────────────────────────

export const sharedFields = (t: Messages) => ({
  email: { key: "email", label: t.shared.form.email, type: "email" } satisfies FieldConfig,
  phone: { key: "phone", label: t.shared.form.phone, type: "tel" } satisfies FieldConfig,
  notes: { key: "notes", label: t.shared.form.notes, type: "textarea", rows: 2 } satisfies FieldConfig,
});

// ─── Player ───────────────────────────────────────────────────────────────────

type PlayerOption = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  ntrp: string | null;
  gender: string | null;
  clubs: string[];
};

function playerAutofill(opt: unknown): Partial<FormValues> {
  const p = opt as PlayerOption;
  return {
    playerId: String(p.id),
    fullNameEn: p.fullNameEn,
    fullNameKo: p.fullNameKo ?? "",
    email: p.email,
    phone: p.phone ?? "",
    ntrp: p.ntrp ?? "",
    gender: p.gender ?? "",
    clubs: p.clubs,
  };
}

// Module-level cache: all players loaded once, searched client-side
let _playerCache: PlayerOption[] | null = null;
let _playerCachePromise: Promise<PlayerOption[]> | null = null;

function getAllPlayers(): Promise<PlayerOption[]> {
  if (_playerCache) return Promise.resolve(_playerCache);
  if (!_playerCachePromise) {
    _playerCachePromise = fetch("/api/players?all=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PlayerOption[]) => { _playerCache = data; return data; })
      .catch(() => { _playerCachePromise = null; return []; });
  }
  return _playerCachePromise;
}

function searchPlayers(all: PlayerOption[], q: string, excludeId?: number | null): PlayerOption[] {
  const norm = q.trim().toLowerCase();
  if (!norm) return all.filter((p) => p.id !== excludeId);
  return all
    .filter((p) => p.id !== excludeId)
    .map((p) => ({
      p,
      score: Math.max(
        fuzzyScore(norm, p.fullNameEn),
        p.fullNameKo ? fuzzyScore(norm, p.fullNameKo) : 0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

async function loadPlayerOptions(q: string): Promise<unknown[]> {
  const all = await getAllPlayers();
  return searchPlayers(all, q);
}

export function playerFields(
  t: Messages,
  { isAdmin = false }: { isAdmin?: boolean } = {},
): FieldConfig[] {
  const f = t.shared.form;

  const fields: FieldConfig[] = [
    {
      key: "fullNameEn",
      label: f.fullNameEn,
      type: "combobox",
      required: true,
      loadOptions: loadPlayerOptions,
      getOptionKey: (p) => (p as PlayerOption).id,
      getOptionLabel: (p) => (p as PlayerOption).fullNameEn,
      autofill: playerAutofill,
      selectedKeyField: "playerId",
      clearKeysOnChange: ["playerId"],
    },
    {
      key: "fullNameKo",
      label: f.fullNameKo,
      type: "combobox",
      loadOptions: loadPlayerOptions,
      getOptionKey: (p) => (p as PlayerOption).id,
      getOptionLabel: (p) => (p as PlayerOption).fullNameKo ?? (p as PlayerOption).fullNameEn,
      autofill: playerAutofill,
      selectedKeyField: "playerId",
      clearKeysOnChange: ["playerId"],
    },
    { key: "email", label: f.email, type: "email", required: true },
    { key: "phone", label: f.phone, type: "tel" },
    {
      key: "ntrp",
      label: f.ntrp,
      type: "select",
      options: () => fetch("/api/ntrp").then((r) => (r.ok ? r.json() : [])),
    },
    {
      key: "clubs",
      label: f.clubs,
      type: "multiselect",
      options: () =>
        fetch("/api/clubs")
          .then((r) => (r.ok ? r.json() : []))
          .then((clubs: { code: string }[]) => clubs.map((c) => c.code)),
      chipClass: clubChipClass,
      placeholder: t.registrationForm.fields.searchClubsPlaceholder,
    },
  ];

  if (isAdmin) {
    const g = t.shared.genderOptions;
    fields.push({
      key: "gender",
      label: t.shared.form.gender,
      type: "select",
      options: [
        { value: "", label: g.unknown },
        { value: "M", label: g.male },
        { value: "F", label: g.female },
      ],
    });
  }

  return fields;
}

// ─── Admin user ───────────────────────────────────────────────────────────────

export function adminUserFields(t: Messages): FieldConfig[] {
  const a = t.adminPage;
  return [
    { key: "email", label: t.shared.form.email, type: "email", required: true },
    {
      key: "active",
      label: a.admins.columns.active,
      type: "select",
      options: [
        { value: "active", label: a.admins.activeLabel },
        { value: "inactive", label: a.admins.inactiveLabel },
      ],
    },
  ];
}

// ─── Category ─────────────────────────────────────────────────────────────────

export function categoryFields(t: Messages, locale: "en" | "ko", year?: number): FieldConfig[] {
  const a = t.adminPage;
  const statusLabel = year
    ? `${a.categories.modal.statusLabel} (${year})`
    : a.categories.modal.statusLabel;
  return [
    {
      key: "status",
      label: statusLabel,
      type: "select",
      required: true,
      options: CATEGORY_YEAR_STATUSES.map((s) => ({ value: s, label: categoryStatusLabel(s, locale) })),
    },
  ];
}

// ─── Prize ────────────────────────────────────────────────────────────────────

export function prizeFields(t: Messages): FieldConfig[] {
  const c = t.adminPage.prizes.columns;
  return [
    { key: "first",  label: c.first,  type: "number" },
    { key: "second", label: c.second, type: "number" },
    { key: "third",  label: c.third,  type: "number" },
    { key: "fourth", label: c.fourth, type: "number" },
  ];
}

// ─── Court booking ────────────────────────────────────────────────────────────

type MatchSide = {
  member1: { fullNameEn: string; fullNameKo: string | null };
  member2: { fullNameEn: string; fullNameKo: string | null } | null;
} | null;

type MatchOption = {
  id?: string;
  myTeamId?: string | null;
  team1Id: string | null;
  team1: MatchSide;
  team2: MatchSide;
  category: { label: string; labelKo: string | null } | null;
};

function buildMatchLabel(m: MatchOption, locale: "en" | "ko"): string {
  const cat = m.category
    ? displayName(m.category.label, m.category.labelKo, locale)
    : null;
  const side = (s: MatchSide): string | null => {
    if (!s) return null;
    const m1 = displayName(s.member1.fullNameEn, s.member1.fullNameKo, locale);
    const m2 = s.member2
      ? displayName(s.member2.fullNameEn, s.member2.fullNameKo, locale)
      : null;
    return m2 ? `${m1} / ${m2}` : m1;
  };
  const teams = [side(m.team1), side(m.team2)].filter(Boolean).join(" vs ");
  return cat ? `${cat} · ${teams}` : teams;
}

// ─── Match ────────────────────────────────────────────────────────────────────

export function matchFields(
  t: Messages,
  locationOptions: string[],
  team1Label: string,
  team2Label: string,
): FieldConfig[] {
  const mo = t.adminPage.matches.modal;
  const ballOptions = [...team1Label.split(" / "), ...team2Label.split(" / ")].filter(Boolean);
  const isCancelledDisabled = (v: Record<string, string | string[] | null | undefined>) => v.isCancelled === "true";
  return [
    { key: "isCancelled", label: mo.cancelled ?? "Cancelled", type: "checkbox" },
    { key: "date", label: mo.date, type: "datepicker", disabledWhen: isCancelledDisabled },
    { key: "time", label: mo.time, type: "timepicker", disabledWhen: isCancelledDisabled },
    {
      key: "location",
      label: mo.location,
      type: "combobox",
      disabledWhen: isCancelledDisabled,
      loadOptions: (q: string) =>
        Promise.resolve(locationOptions.filter((l) => !q.trim() || l.toLowerCase().includes(q.toLowerCase()))),
      getOptionKey: (l) => l as string,
      getOptionLabel: (l) => l as string,
    },
    { type: "divider", key: "scores-divider" },
    { type: "section-heading", key: "scores-heading", heading: mo.scoresSection },
    {
      type: "score-grid",
      key: "scores",
      team1Label,
      team2Label,
      disabledWhen: isCancelledDisabled,
      sets: [
        { label: mo.set1, key1: "set1T1", key2: "set1T2" },
        { label: mo.set2, key1: "set2T1", key2: "set2T2" },
        { label: mo.set3, key1: "set3T1", key2: "set3T2" },
      ],
      walkover: { label: mo.walkover, key1: "team1Withdrawn", key2: "team2Withdrawn" },
    },
    {
      key: "ball",
      label: mo.ball,
      type: "select",
      disabledWhen: isCancelledDisabled,
      placeholder: "Select a player",
      options: ballOptions.map((n) => ({ value: n, label: n })),
    },
    { key: "comment", label: mo.comment, type: "textarea", rows: 2 },
  ];
}

// ─── Registration ─────────────────────────────────────────────────────────────


export function courtBookingFields(
  t: Messages,
  locale: "en" | "ko",
  year: number,
): FieldConfig[] {
  const cb = t.adminPage.courtBookings;
  return [
    {
      key: "status",
      label: cb.columns.status,
      type: "select",
      options: [
        { value: "Available", label: cb.availableLabel },
        { value: "Booked", label: cb.bookedLabel },
      ],
    },
    {
      key: "matchLabel",
      label: cb.matchLabel,
      type: "combobox",
      placeholder: cb.matchSearchPlaceholder,
      loadOptions: async (q) => {
        if (!q.trim()) return [];
        const r = await fetch(`/api/court-bookings?playerName=${encodeURIComponent(q)}&year=${year}`);
        return r.ok ? r.json() : [];
      },
      getOptionKey: (m) => (m as MatchOption).id ?? "",
      getOptionLabel: (m) => buildMatchLabel(m as MatchOption, locale),
      visibleWhen: (values) => values.status !== "Available",
      autofill: (m) => {
        const match = m as MatchOption;
        const label = buildMatchLabel(match, locale);
        const side = (s: MatchSide): string =>
          s
            ? [
                displayName(s.member1.fullNameEn, s.member1.fullNameKo, locale),
                s.member2
                  ? displayName(s.member2.fullNameEn, s.member2.fullNameKo, locale)
                  : null,
              ]
                .filter(Boolean)
                .join(" / ")
            : "";
        return {
          matchLabel: label,
          matchId: match.id ?? "",
          teamId: match.myTeamId ?? match.team1Id ?? "",
          team1Label: side(match.team1),
          team2Label: side(match.team2),
        };
      },
    },
    { key: "notes", label: cb.courtBookingNotesLabel, type: "textarea", rows: 2 },
  ];
}

// ─── Registration form fields ─────────────────────────────────────────────────

export const REGISTRATION_PAYMENT_KEYS = new Set(["nameOnEtransfer", "etransferSent", "paymentReceived"]);
export const REGISTRATION_OTHER_KEYS = new Set(["mediaConsent", "notes", "adminComments"]);

type PartnerOption = {
  id: number;
  fullNameEn: string;
  fullNameKo: string | null;
};

/**
 * Full field list for new/edit registrations.
 * Admin context adds paymentReceived + adminComments, omits public-only consent/etransfer checkboxes.
 * `currentPlayerId` is used to exclude the main player from partner search results.
 * The `categories` form value stores category IDs (not labels).
 */
// ─── Giveaway ─────────────────────────────────────────────────────────────────

export type GiveawayOptionRecord = {
  optionId: string;
  label: string;
  imageSrc?: string | null;
  status: string;
  stock?: number;
  count?: number;
  ml?: string | null;
  colour?: string | null;
  colourKo?: string | null;
};

function buildChoiceCardOptions(options: GiveawayOptionRecord[], unavailableLabel: string, availableLabel: string) {
  return options.map((opt) => {
    const unavailable = opt.status === "Unavailable";
    return {
      value: opt.optionId,
      label: opt.label,
      sublabel: opt.ml ?? undefined,
      imageSrc: opt.imageSrc ?? undefined,
      disabled: unavailable,
      badge: unavailable ? unavailableLabel : availableLabel,
      badgeClassName: unavailable
        ? "tumbler-status-chip-unavailable"
        : "tumbler-status-chip-available",
    };
  });
}

/**
 * mode: "player"       → first option (non-admin submit page)
 * mode: "admin-first"  → first option only (admin step 2, leads to Next)
 * mode: "admin-second" → second option (admin step 3, Submit)
 */
export function giveawayFields(
  t: Messages,
  options: GiveawayOptionRecord[],
  mode: "player" | "admin-first" | "admin-second" = "player",
): FieldConfig[] {
  const g = t.giveawayPage;
  const cardOptions = buildChoiceCardOptions(options, g.unavailableLabel, g.availableLabel);

  if (mode === "admin-second") {
    return [{
      key: "optionId2",
      label: g.secondChoiceLabel,
      type: "choicecards",
      showImage: true,
      variant: "vertical" as const,
      options: cardOptions,
    }];
  }

  // mode === "player" or "admin-first"
  return [{
    key: "optionId",
    label: g.choiceLabel,
    type: "choicecards",
    required: true,
    showImage: true,
    variant: "vertical" as const,
    options: cardOptions,
  }];
}

export function registrationFields(
  t: Messages,
  locale: "en" | "ko",
  doublesCategories: Pick<CategoryRecord, "id" | "label" | "labelKo">[],
  allCategories: Pick<CategoryRecord, "id" | "label" | "labelKo" | "category" | "categoryKo">[],
  currentPlayerId: string | null | undefined,
  { isAdmin = false }: { isAdmin?: boolean } = {},
): FieldConfig[] {
  const rf = t.registrationForm;

  const excludePlayerId = currentPlayerId ? Number(currentPlayerId) : null;
  const partnerLoadOptions = async (q: string): Promise<unknown[]> => {
    const all = await getAllPlayers();
    return searchPlayers(all, q, excludePlayerId);
  };

  // Category options using MultiselectOption so form stores IDs, displays labels
  const categoryMultiselectOptions: MultiselectOption[] = allCategories.map((c) => ({
    id: c.id,
    label: locale === "ko" ? (c.labelKo ?? c.label) : c.label,
    chipClassName: categoryChipClass(c.id),
    group: (locale === "ko" ? (c.categoryKo ?? c.category) : c.category) ?? undefined,
  }));

  // Apply registration-specific required flags and NTRP placeholder on top of playerFields
  const basePlayerFields = playerFields(t, { isAdmin });
  const registrationPlayerFields = basePlayerFields.map((f): FieldConfig => {
    if (f.key === "phone") return { ...f, required: true } as FieldConfig;
    if (f.key === "ntrp" && f.type === "select") {
      return { ...f, placeholder: rf.options.selectLevel };
    }
    return f;
  });

  // ─── Section 1: Personal details ──────────────────────────────────────────

  const personalFields: FieldConfig[] = [
    ...registrationPlayerFields,

    // Categories — stores IDs in form values
    {
      key: "categories",
      label: rf.fields.categories,
      type: "multiselect",
      required: true,
      options: categoryMultiselectOptions,
      placeholder: rf.fields.searchCategoriesPlaceholder,
    } satisfies FieldConfig,

    // Partner combobox per doubles category (shown only when that category is selected)
    ...doublesCategories.map((cat): FieldConfig => {
      const catLabel = locale === "ko" ? (cat.labelKo ?? cat.label) : cat.label;
      const partnerKey = `partner_${cat.id}`;
      const partnerIdKey = `partnerId_${cat.id}`;
      return {
        key: partnerKey,
        label: `${rf.fields.partnerName} — ${catLabel}`,
        type: "combobox",
        required: true,
        loadOptions: partnerLoadOptions,
        getOptionKey: (p) => (p as PartnerOption).id,
        getOptionLabel: (p) =>
          locale === "ko"
            ? ((p as PartnerOption).fullNameKo ?? (p as PartnerOption).fullNameEn)
            : (p as PartnerOption).fullNameEn,
        autofill: (p) => ({
          [partnerKey]: locale === "ko"
            ? ((p as PartnerOption).fullNameKo ?? (p as PartnerOption).fullNameEn)
            : (p as PartnerOption).fullNameEn,
          [partnerIdKey]: String((p as PartnerOption).id),
        }),
        clearKeysOnChange: [partnerIdKey],
        selectedKeyField: partnerIdKey,
        visibleWhen: (values) =>
          Array.isArray(values.categories) &&
          (values.categories as string[]).includes(cat.id),
      };
    }),
  ];

  // ─── Section 2: Payment details ───────────────────────────────────────────

  const paymentFields: FieldConfig[] = [
    { key: "nameOnEtransfer", label: rf.fields.nameOnEtransfer, type: "text", required: true },
    ...(!isAdmin ? [
      { key: "etransferSent", label: rf.helper.etransferSent, type: "checkbox", required: true } satisfies FieldConfig,
    ] : [
      { key: "paymentReceived", label: "Payment Received", type: "checkbox" } satisfies FieldConfig,
    ]),
  ];

  // ─── Section 3: Other details ─────────────────────────────────────────────

  const otherFields: FieldConfig[] = [
    ...(!isAdmin ? [
      { key: "mediaConsent", label: rf.helper.mediaConsent, type: "checkbox", required: true } satisfies FieldConfig,
    ] : []),
    { key: "notes", label: rf.fields.notes, type: "textarea", rows: 2 },
    ...(isAdmin ? [
      { key: "adminComments", label: "Comments (admin only)", type: "textarea", rows: 2 } satisfies FieldConfig,
    ] : []),
  ];

  const statusFields: FieldConfig[] = isAdmin ? [
    {
      key: "status",
      label: "Status",
      type: "select",
      withChips: true,
      options: REGISTRATION_STATUSES.map((s) => ({
        value: s,
        label: registrationStatusLabel(s, locale),
        chipClassName: registrationStatusChipClass(s),
      })),
    } satisfies FieldConfig,
  ] : [];

  return [...statusFields, ...personalFields, ...paymentFields, ...otherFields];
}
