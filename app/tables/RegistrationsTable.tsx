"use client";

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  buildCategoryByIdMap,
  categoryLabelForId,
  categoryChipClass,
  getCategory,
} from "@/lib/category/categories";
import type { CategoryRecord } from "@/lib/category/categories";
import { type Locale } from "@/lib/content";
import { RegistrationForm, type RegistrationFormHandle } from "@/app/registration/RegistrationForm";
import { prefetchRegistrationFormData, registrationStatusLabel, registrationStatusChipClass } from "@/lib/registration";
import { useLocale } from "@/lib/locale-context";
import { Table } from "@/app/components/ui/table/Table";
import { Modal } from "@/app/components/ui/Modal";
import { type CategoryYearStatus } from "@/lib/category/categories";
import { buildRegistrationRows, type SerializedRawReg } from "./registrationRows";

export type RegistrationRow = {
  id: string;
  playerId: number | null;
  registrationNumber: number | null;
  tournamentYear: number;
  fullNameEn: string;
  fullNameKo: string | null;
  email: string;
  phone: string | null;
  category: string;
  categories: string | null;
  ntrp: string | null;
  clubs: string | null;
  nameOnEtransfer: string | null;
  partnerNameEn: string | null;
  partnerNameKo: string | null;
  partnerId: number | null;
  partnerNames: string | null;
  photoVideoConsent: boolean;
  engraving: string | null;
  notes: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function getLinkedPartnerDisplay(
  partnerNameEn: string | null,
  partnerNameKo: string | null,
  locale: Locale
): string {
  if (locale === "ko" && partnerNameKo?.trim()) return partnerNameKo.trim();
  if (partnerNameEn?.trim()) return partnerNameEn.trim();
  if (partnerNameKo?.trim()) return partnerNameKo.trim();
  return "";
}

function formatPartnerNames(
  categoryById: Map<string, CategoryRecord>,
  categoryRecords: CategoryRecord[],
  partnerNames: string | null,
  partnerNameEn: string | null,
  partnerNameKo: string | null,
  categoryIds: string[],
  locale: Locale
): { text: string; hasMultiplePartners: boolean } {
  const linked = getLinkedPartnerDisplay(partnerNameEn, partnerNameKo, locale);

  if (partnerNames) {
    try {
      const obj = JSON.parse(partnerNames) as Record<string, string>;
      const entries = categoryIds.reduce<{ category: string; name: string }[]>((acc, c) => {
        const name =
          obj[c]?.trim() ??
          obj[getCategory(categoryRecords, c)?.id ?? c]?.trim() ??
          obj[getCategory(categoryRecords, c)?.label ?? c]?.trim() ??
          linked;
        if (name) acc.push({ category: categoryLabelForId(categoryById, c, locale), name });
        return acc;
      }, []);

      if (entries.length > 0) {
        const hasMultiple = entries.length > 1;
        return {
          text: hasMultiple ? entries.map((e) => `${e.category}: ${e.name}`).join("; ") : entries[0].name,
          hasMultiplePartners: hasMultiple,
        };
      }
    } catch {
      //
    }
  }

  return { text: linked || "", hasMultiplePartners: false };
}

function parseClubs(clubs: string | null): string[] {
  if (!clubs) return [];
  try {
    const a = JSON.parse(clubs);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function parseRegistrationCategories(
  categories: string | null,
  fallbackCategory: string
): string[] {
  if (categories) {
    try {
      const a = JSON.parse(categories);
      if (Array.isArray(a) && a.length > 0) return a.filter((c): c is string => typeof c === "string");
    } catch {
      //
    }
  }
  return fallbackCategory ? [fallbackCategory] : [];
}

export function registrationRowToRegistrationPageInitial(
  reg: RegistrationRow,
  categoryRecords: CategoryRecord[],
  locale: Locale
) {
  const cats = parseRegistrationCategories(reg.categories, reg.category).map((c) =>
    getCategory(categoryRecords, c)?.id ?? c
  );
  const byId = buildCategoryByIdMap(categoryRecords);
  const isDoubles = (id: string) => byId.get(id)?.isDoubles ?? false;
  const partnerNames: Record<string, string> = {};

  if (reg.partnerNames) {
    try {
      const obj = JSON.parse(reg.partnerNames) as Record<string, string>;
      cats.filter(isDoubles).forEach((catId) => {
        const name = obj[catId] ?? obj[getCategory(categoryRecords, catId)?.label ?? catId] ?? "";
        if (name) partnerNames[catId] = name;
      });
    } catch {
      //
    }
  }

  const partnerEn = reg.partnerNameEn?.trim();
  const partnerKo = reg.partnerNameKo?.trim();
  if (partnerEn || partnerKo) {
    const forForm = locale === "ko" && partnerKo ? partnerKo : (partnerEn ?? partnerKo ?? "");
    if (forForm) {
      const currentCategoryId = getCategory(categoryRecords, reg.category)?.id ?? reg.category;
      if (currentCategoryId && isDoubles(currentCategoryId)) {
        partnerNames[currentCategoryId] = forForm;
      }
    }
  }

  const rawEngraving = (reg.engraving ?? "").trim();
  const legacyRequested = rawEngraving.toLowerCase() === "requested";

  return {
    selectedPlayerId: reg.playerId != null ? String(reg.playerId) : null,
    fullNameEn: reg.fullNameEn,
    fullNameKo: reg.fullNameKo ?? "",
    email: reg.email,
    phone: reg.phone ?? "",
    ntrp: reg.ntrp ?? "",
    clubs: parseClubs(reg.clubs),
    categories: cats,
    partnerNames,
    photoVideoConsent: reg.photoVideoConsent,
    engravingWanted: !!rawEngraving,
    engravingText: rawEngraving && !legacyRequested ? rawEngraving.slice(0, 25) : "",
    nameOnEtransfer: reg.nameOnEtransfer ?? "",
    etransferSent: /e-transfer/i.test(reg.notes ?? ""),
  };
}

type DerivedRow = {
  raw: RegistrationRow;
  displayName: string;
  partnerDisplay: { text: string; hasMultiplePartners: boolean };
  status: "Pending" | "Confirmed" | "Cancelled" | "Refund Requested" | "Refunded";
  cats: [string];
};

type RegistrationsTableProps = {
  initial: SerializedRawReg[];
  categories: CategoryRecord[];
  year: number;
  totalCount?: number;
  categoryStatusById: Record<string, CategoryYearStatus>;
  categoryFilter: string;
};

type RegSortKey = "regNumber" | "name" | "partner" | "category" | "status" | "media" | "engraving";

export function RegistrationsTable({
  initial,
  categories,
  year,
  totalCount,
  categoryStatusById,
  categoryFilter,
}: RegistrationsTableProps) {
  const { locale, t } = useLocale();
  const adminReg = t.adminRegistrations;
  const router = useRouter();

  const [editing, setEditing] = useState<RegistrationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<RegSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  const categoryIsDoubles = useMemo(
    () => new Map(categories.map((c) => [c.id, c.isDoubles])),
    [categories]
  );

  const rows = useMemo(
    () => buildRegistrationRows(initial, categoryIsDoubles),
    [initial, categoryIsDoubles]
  );

  const editFormRef = useRef<RegistrationFormHandle>(null);

  // Pre-warm registration form data cache so edit modal opens instantly
  useEffect(() => { prefetchRegistrationFormData(); }, []);

  const showConsentAndEngraving = year > 2025;

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
  }, [year, showConsentAndEngraving]);

  const derivedRows = useMemo<DerivedRow[]>(
    () =>
      rows.map((r) => ({
        raw: r,
        displayName: locale === "ko" && r.fullNameKo?.trim() ? r.fullNameKo.trim() : r.fullNameEn,
        partnerDisplay: formatPartnerNames(
          categoriesById,
          categories,
          r.partnerNames,
          r.partnerNameEn,
          r.partnerNameKo,
          [r.category],
          locale
        ),
        // Registration's own terminal/confirmed statuses take precedence.
        // Pending registrations fall back to derived status from the category-year state.
        status: (
          r.status === "Confirmed" || r.status === "Refund Requested" || r.status === "Cancelled" || r.status === "Refunded"
            ? r.status
            : categoryStatusById[r.category] === "Active"
              ? "Confirmed"
              : categoryStatusById[r.category] === "Inactive"
                ? "Cancelled"
                : "Pending"
        ) as DerivedRow["status"],
        cats: [r.category] as [string],
      })),
    [rows, categories, categoriesById, locale, categoryStatusById]
  );

  const sortedRows = useMemo<DerivedRow[]>(() => {
    if (!sortKey) return derivedRows;
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }) * dir;
    const cmpNum = (a: number, b: number) => (a - b) * dir;

    return [...derivedRows].sort((a, b) => {
      switch (sortKey) {
        case "regNumber":
          return cmpNum(a.raw.registrationNumber ?? 1e9, b.raw.registrationNumber ?? 1e9);
        case "name":
          return cmpStr(a.raw.fullNameEn.trim(), b.raw.fullNameEn.trim());
        case "category":
          return cmpStr(a.raw.category ?? "", b.raw.category ?? "");
        case "partner":
          return cmpStr(a.partnerDisplay.text, b.partnerDisplay.text);
        case "status":
          return cmpStr(a.status, b.status);
        case "media":
          return cmpNum(a.raw.photoVideoConsent ? 1 : 0, b.raw.photoVideoConsent ? 1 : 0);
        case "engraving":
          return cmpStr((a.raw.engraving ?? "").trim(), (b.raw.engraving ?? "").trim());
        default:
          return 0;
      }
    });
  }, [derivedRows, sortKey, sortDir]);

  const filteredSortedRows = useMemo(
    () => (categoryFilter ? sortedRows.filter((r) => r.raw.category === categoryFilter) : sortedRows),
    [sortedRows, categoryFilter]
  );

  const handleRegSort = useCallback((key: string) => {
    const k = key as RegSortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setError("");
      setSaving(true);
      try {
        const res = await fetch(`/api/registrations/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Delete failed");
          return;
        }
        setDeletingId(null);
        router.refresh();
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  const handleCloseEditing = useCallback(() => setEditing(null), []);
  const handleEditSuccess = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const handleRequestDelete = useCallback(() => {
    setEditing((prev) => {
      if (prev) setDeletingId(prev.id);
      return null;
    });
  }, []);

  const handleCancelDelete = useCallback(() => setDeletingId(null), []);

  const statusMeta = useCallback(
    (status: string): { label: string; chipClass: string } => ({
      label: registrationStatusLabel(status, locale),
      chipClass: registrationStatusChipClass(status),
    }),
    [locale]
  );

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-[var(--color-text-tertiary)]">No registrations yet.</div>
    );
  }

  const totalCountResolved = totalCount ?? rows.length;
  const headers = showConsentAndEngraving
    ? [adminReg.tableRegNumber, t.shared.labels.name, adminReg.tablePartner, t.shared.labels.category, t.shared.labels.status, adminReg.tableMediaConsent, adminReg.tableEngraving]
    : [adminReg.tableRegNumber, t.shared.labels.name, adminReg.tablePartner, t.shared.labels.category, t.shared.labels.status];
  const sortKeys = showConsentAndEngraving
    ? (["regNumber", "name", "partner", "category", "status", "media", "engraving"] as RegSortKey[])
    : (["regNumber", "name", "partner", "category", "status"] as RegSortKey[]);

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
          {error}
        </div>
      )}

      <div className="flex flex-col w-full min-w-0">
        <Table
          variant="data"
          headers={headers}
          sortConfig={{
            activeKey: sortKey,
            direction: sortDir,
            keys: sortKeys,
            onSort: handleRegSort,
          }}
          dataRows={filteredSortedRows.map(({ raw: r, displayName, partnerDisplay, status, cats }) => {
            const { label: statusLabel, chipClass: statusChipClass } = statusMeta(status);

            const baseCells: (string | ReactNode)[] = [
              <Table.Cell key={`${r.id}-regnum`} type="technical-id">
                {r.registrationNumber != null ? String(r.registrationNumber) : "—"}
              </Table.Cell>,
              <span key={`${r.id}-name`} title={r.id}>
                {displayName}
              </span>,
              <span
                key={`${r.id}-partner`}
                title={partnerDisplay.hasMultiplePartners ? "Partner per category (multiple doubles)" : undefined}
              >
                <Table.Cell type="players" text={partnerDisplay.text || undefined} splitSemicolons />
              </span>,
              <Table.Cell key={`${r.id}-cats`} type="chips" items={cats.map((c) => ({ label: categoryLabelForId(categoriesById, c, locale), className: categoryChipClass(c), title: c }))} />,
              <Table.Cell key={`${r.id}-status-group`} type="chips" items={[{ className: statusChipClass, label: statusLabel }]} />,
            ];

            if (showConsentAndEngraving) {
              baseCells.push(
                <Table.Cell key={`${r.id}-media`} type="icon-center">
                  <span
                    className="inline-flex"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={r.photoVideoConsent}
                      readOnly
                      aria-label={`Media consent for ${r.fullNameEn}`}
                    />
                  </span>
                </Table.Cell>,
                r.engraving?.trim() ? r.engraving : "—"
              );
            }

            return baseCells;
          })}
          onRowClick={(_, rowIndex) => {
            const row = filteredSortedRows[rowIndex];
            if (row) setEditing(row.raw);
          }}
        />
        <div className="mt-2 flex w-full justify-end">
          <p className="m-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
            {adminReg.totalCount(filteredSortedRows.length)}
          </p>
        </div>
      </div>

      {editing && (
        <Modal
          onClose={handleCloseEditing}
          title={adminReg.editModalTitle}
          ariaLabelledBy="edit-registration-modal-title"
          secondaryAction={{
            label: adminReg.deleteEllipsis,
            onClick: handleRequestDelete,
            type: "button",
            disabled: isEditingSubmitting,
          }}
          primaryAction={{
            label: "Save",
            onClick: () => editFormRef.current?.submit(),
            type: "button",
            disabled: isEditingSubmitting,
          }}
        >
          <RegistrationForm
            ref={editFormRef}
            key={editing.id}
            mode="adminEdit"
            registrationId={editing.id}
            initialFormState={registrationRowToRegistrationPageInitial(editing, categories, locale)}
            initialStatus={editing.status}
            onClose={handleCloseEditing}
            onSuccess={handleEditSuccess}
            onLoadingChange={setIsEditingSubmitting}
          />
        </Modal>
      )}

      {deletingId && (
        <Modal
          onClose={handleCancelDelete}
          title={adminReg.deleteModalTitle}
          ariaLabelledBy="delete-registration-modal-title"
          maxWidthClassName="w-full max-w-sm"
          primaryAction={{
            label: saving ? adminReg.deleteModalDeleting : adminReg.deleteRegistration,
            onClick: () => handleDelete(deletingId),
            type: "button",
            disabled: saving,
          }}
        >
          <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{adminReg.deleteModalBody}</p>
        </Modal>
      )}
    </>
  );
}