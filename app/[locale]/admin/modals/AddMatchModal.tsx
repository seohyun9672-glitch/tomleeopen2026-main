"use client";

import { useState } from "react";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/category/categories";
import type { CategoryRecord } from "@/lib/category/categories";
import { matchStatusLabel } from "@/lib/matches";
import { ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F } from "@/lib/round";
import { useLocale } from "@/lib/locale-context";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";

const ROUND_CODES = [ROUND_PRE, ROUND_R16, ROUND_QF, ROUND_SF, ROUND_F] as const;

type Props = {
  categories: CategoryRecord[];
  year: number;
  locationOptions: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function AddMatchModal({ categories, year, locationOptions, onClose, onSaved }: Props) {
  const { locale, t } = useLocale();
  const am = t.adminMatches;
  const ap = t.adminPlayers;

  const categoriesById = buildCategoryByIdMap(categories);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [roundCode, setRoundCode] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Scheduled");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!categoryId) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentYear: year,
          categoryId,
          roundCode: roundCode || undefined,
          date: date || null,
          time: time || null,
          location: location.trim() || null,
          matchStatus: status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Save failed");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={am.addModalTitle}
      ariaLabelledBy="add-match-modal-title"
      closeLabel={t.shared.modal.close}
      primaryAction={{
        label: saving ? ap.saving : ap.save,
        onClick: handleSave,
        type: "button",
        disabled: saving || !categoryId,
      }}
      secondaryAction={{
        label: ap.cancel,
        onClick: onClose,
        type: "button",
        disabled: saving,
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {error && (
          <div className="md:col-span-2 rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
            {error}
          </div>
        )}

        <Field
          label={t.shared.labels.category}
          required
          variant="select"
          id="add-match-category"
          wrapperClassName="md:col-span-2"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryLabelForId(categoriesById, c.id, locale)}
            </option>
          ))}
        </Field>

        <Field
          label={t.shared.labels.round}
          variant="select"
          id="add-match-round"
          value={roundCode}
          onChange={(e) => setRoundCode(e.target.value)}
        >
          <option value="">—</option>
          {ROUND_CODES.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </Field>

        <Field
          label={am.status}
          variant="select"
          id="add-match-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Scheduled">{matchStatusLabel("Scheduled", locale)}</option>
          <option value="Pending">{matchStatusLabel("Pending", locale)}</option>
        </Field>

        <Field
          label={t.shared.labels.date}
          variant="date"
          id="add-match-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Field
          label={am.time}
          variant="time"
          id="add-match-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <Field
          label={am.tableLocation}
          variant="combobox"
          id="add-match-location"
          wrapperClassName="md:col-span-2"
          value={location}
          onValueChange={(v) => setLocation(v)}
          loadOptions={async (query) => {
            const q = query.trim().toLowerCase();
            if (!q) return locationOptions;
            return locationOptions.filter((loc) => loc.toLowerCase().includes(q));
          }}
          onSelect={(loc) => setLocation(loc)}
          getOptionKey={(loc) => loc}
          getOptionLabel={(loc) => loc}
          minQueryLength={0}
          showInitialOptions
          emptyText={am.noLocations}
        />
      </div>
    </Modal>
  );
}
