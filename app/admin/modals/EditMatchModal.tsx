"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCategoryByIdMap, categoryLabelForId } from "@/lib/categories/labels";
import type { CategoryRecord } from "@/lib/categories/types";
import type { MatchWithTeamNames } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { Modal } from "@/app/components/ui/Modal";
import { Field } from "@/app/components/ui/Field";
import { Label } from "@/app/components/ui/Label";
import { Divider } from "@/app/components/ui/Divider";

const FORM_SURFACE_CLASS =
  "bg-[var(--form-surface-bg)] text-[var(--color-text-primary)] [--section-text:var(--color-text-primary)] [--input-text:var(--color-text-primary)] [--input-bg:var(--form-surface-bg)] [--input-focus-border:var(--outline-blue-focus)] [--input-focus-ring:var(--outline-blue-focus-ring)]";

function toTimeInputValue(s: string | null): string {
  if (!s?.trim()) return "";
  const t = s.trim();

  const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const min = m24[2];
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${min}`;
  }

  const m12 = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(t);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2];
    const pm = (m12[3] ?? "").toLowerCase() === "pm";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:${min}`;
  }

  return "";
}

/** Converts HH:MM (24-hour input value) back to "6:00AM" display/storage format. */
function fromTimeInputValue(s: string): string | null {
  if (!s?.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return s.trim() || null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min}${suffix}`;
}

type MatchStatusOption = "Completed" | "Scheduled" | "Pending" | "Cancelled";

const ADMIN_EDIT_MATCH_FORM_ID = "admin-edit-match-form";

type EditMatchModalProps = {
  match: MatchWithTeamNames;
  categories: CategoryRecord[];
  locationOptions: string[];
  onClose: () => void;
  onRequestDelete: () => void;
  onSave: (data: Partial<MatchWithTeamNames>) => void;
  saving: boolean;
};

export function EditMatchModal({
  match,
  categories,
  locationOptions,
  onClose,
  onRequestDelete,
  onSave,
  saving,
}: EditMatchModalProps) {
  const { t, matchStatusLabel: matchStatusLabelForLocale } = useLocale();
  const am = t.adminMatches;

  const [date, setDate] = useState(() => {
    const d = match.date?.trim();
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  });
  const [time, setTime] = useState(() => toTimeInputValue(match.time) || "");
  const [location, setLocation] = useState(match.location ?? "");
  const [set1Team1, setSet1Team1] = useState(match.set1ScoreTeam1 ?? "");
  const [set1Team2, setSet1Team2] = useState(match.set1ScoreTeam2 ?? "");
  const [set2Team1, setSet2Team1] = useState(match.set2ScoreTeam1 ?? "");
  const [set2Team2, setSet2Team2] = useState(match.set2ScoreTeam2 ?? "");
  const [set3Team1, setSet3Team1] = useState(match.set3ScoreTeam1 ?? "");
  const [set3Team2, setSet3Team2] = useState(match.set3ScoreTeam2 ?? "");
  const [comment, setComment] = useState(match.comment ?? "");
  const [status, setStatus] = useState<MatchStatusOption>(
    (match.matchStatus as MatchStatusOption) ?? "Pending"
  );

  useEffect(() => {
    const nextDate = match.date?.trim();
    setDate(nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate) ? nextDate : "");
    setTime(toTimeInputValue(match.time) || "");
    setLocation(match.location ?? "");
    setSet1Team1(match.set1ScoreTeam1 ?? "");
    setSet1Team2(match.set1ScoreTeam2 ?? "");
    setSet2Team1(match.set2ScoreTeam1 ?? "");
    setSet2Team2(match.set2ScoreTeam2 ?? "");
    setSet3Team1(match.set3ScoreTeam1 ?? "");
    setSet3Team2(match.set3ScoreTeam2 ?? "");
    setComment(match.comment ?? "");
    setStatus((match.matchStatus as MatchStatusOption) ?? "Pending");
  }, [match]);

  const categoriesById = useMemo(() => buildCategoryByIdMap(categories), [categories]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      date: date.trim() || null,
      time: fromTimeInputValue(time),
      location: location.trim() || null,
      matchStatus: status,
      set1ScoreTeam1: set1Team1.trim() || null,
      set1ScoreTeam2: set1Team2.trim() || null,
      set2ScoreTeam1: set2Team1.trim() || null,
      set2ScoreTeam2: set2Team2.trim() || null,
      set3ScoreTeam1: set3Team1.trim() || null,
      set3ScoreTeam2: set3Team2.trim() || null,
      comment: comment.trim() || null,
    });
  }

  const categoryLabel =
    categoryLabelForId(categoriesById, match.categoryId, "en") ||
    match.categoryDisplayLabel?.trim() ||
    match.categoryId;

  const roundLabel = (match.roundDisplay ?? match.round ?? "").trim() || "—";

  const subtitle = useMemo(() => {
    const numberPart = match.matchNumber != null ? ` #${match.matchNumber}` : "";
    return `${categoryLabel} - ${roundLabel}${numberPart}`;
  }, [categoryLabel, roundLabel, match.matchNumber]);

  return (
    <Modal
      onClose={onClose}
      title={am.editMatchTitle}
      ariaLabelledBy="edit-match-modal-title"
      secondaryAction={{
        label: am.deleteEllipsis,
        onClick: onRequestDelete,
        type: "button",
        disabled: saving,
      }}
      primaryAction={{
        label: saving ? am.saving : am.save,
        type: "submit",
        form: ADMIN_EDIT_MATCH_FORM_ID,
        disabled: saving,
      }}
    >
      <div className={FORM_SURFACE_CLASS}>
        <div className="mb-4 text-sm text-[var(--color-text-secondary)]">{subtitle}</div>

        <form
          id={ADMIN_EDIT_MATCH_FORM_ID}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6"
        >
          <div className="md:col-span-2">
            <Label htmlFor="edit-location">{am.tableLocation}</Label>
            <Field
              variant="combobox"
              id="edit-location"
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

          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <div>
              <Label htmlFor="edit-date">{am.date}</Label>
              <Field variant="date" id="edit-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-time">{am.time}</Label>
              <Field variant="time" id="edit-time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="md:col-span-2">
            <Divider />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">{am.setScores}</p>
            <div className="grid grid-cols-[auto_repeat(3,minmax(3rem,1fr))] items-center gap-x-3 gap-y-2 text-sm">
              <div />
              <div className="text-center font-medium text-[var(--color-text-primary)]">{am.set1}</div>
              <div className="text-center font-medium text-[var(--color-text-primary)]">{am.set2}</div>
              <div className="text-center font-medium text-[var(--color-text-primary)]">{am.set3}</div>

              <div className="truncate whitespace-nowrap text-left font-medium text-[var(--color-text-primary)]">
                {match.team1DisplayName ?? "Player 1"}
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set1-team1" value={set1Team1} onChange={(e) => setSet1Team1(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set2-team1" value={set2Team1} onChange={(e) => setSet2Team1(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set3-team1" value={set3Team1} onChange={(e) => setSet3Team1(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>

              <div className="truncate whitespace-nowrap text-left font-medium text-[var(--color-text-primary)]">
                {match.team2DisplayName ?? "Player 2"}
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set1-team2" value={set1Team2} onChange={(e) => setSet1Team2(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set2-team2" value={set2Team2} onChange={(e) => setSet2Team2(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>
              <div className="flex justify-center">
                <Field variant="text" id="edit-set3-team2" value={set3Team2} onChange={(e) => setSet3Team2(e.target.value)} className="w-12 px-2 py-1 text-center" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Divider />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="edit-status">{am.status}</Label>
            <Field
              variant="select"
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MatchStatusOption)}
            >
              <option value="Pending">{matchStatusLabelForLocale("Pending")}</option>
              <option value="Scheduled">{matchStatusLabelForLocale("Scheduled")}</option>
              <option value="Completed">{matchStatusLabelForLocale("Completed")}</option>
              <option value="Cancelled">{matchStatusLabelForLocale("Cancelled")}</option>
            </Field>
          </div>

          <div className="md:col-span-2">
            <Divider />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="edit-comment">{am.comment}</Label>
            <Field variant="text" id="edit-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </form>
      </div>
    </Modal>
  );
}