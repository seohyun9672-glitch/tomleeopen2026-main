"use client";

import { useState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { MATCH_STATUS_LABELS } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";
import { Divider } from "./ui/Divider";

export type MatchFormValues = {
  matchStatus: string;
  date: string;
  time: string;
  location: string;
  ball: string | null;
  comment: string;
  set1T1: string;
  set2T1: string;
  set3T1: string;
  set1T2: string;
  set2T2: string;
  set3T2: string;
  team1Withdrawn: boolean;
  team2Withdrawn: boolean;
};

const EMPTY: MatchFormValues = {
  matchStatus: "Pending",
  date: "",
  time: "",
  location: "",
  ball: null,
  comment: "",
  set1T1: "",
  set2T1: "",
  set3T1: "",
  set1T2: "",
  set2T2: "",
  set3T2: "",
  team1Withdrawn: false,
  team2Withdrawn: false,
};

function deriveStatus(v: MatchFormValues): string {
  if (v.set1T1 || v.set1T2) return "Completed";
  if (v.date && v.time && v.location) return "Scheduled";
  return "Pending";
}

function withdrawnScores(
  winner: 1 | 2,
): Pick<
  MatchFormValues,
  "set1T1" | "set2T1" | "set3T1" | "set1T2" | "set2T2" | "set3T2"
> {
  return winner === 1
    ? {
        set1T1: "6",
        set2T1: "6",
        set3T1: "",
        set1T2: "0",
        set2T2: "0",
        set3T2: "",
      }
    : {
        set1T1: "0",
        set2T1: "0",
        set3T1: "",
        set1T2: "6",
        set2T2: "6",
        set3T2: "",
      };
}

function deriveWithdrawn(d: Partial<MatchFormValues>): {
  team1Withdrawn: boolean;
  team2Withdrawn: boolean;
} {
  const s1t1 = d.set1T1 ?? "";
  const s1t2 = d.set1T2 ?? "";
  const s2t1 = d.set2T1 ?? "";
  const s2t2 = d.set2T2 ?? "";
  return {
    team1Withdrawn:
      s1t1 === "0" && s2t1 === "0" && s1t2 === "6" && s2t2 === "6",
    team2Withdrawn:
      s1t2 === "0" && s2t2 === "0" && s1t1 === "6" && s2t1 === "6",
  };
}

type Props = {
  matchId: string;
  defaultValues?: Partial<MatchFormValues>;
  team1Label?: string;
  team2Label?: string;
  idPrefix?: string;
  locationOptions?: string[];
  formId?: string;
  onSave: (updated?: Partial<MatchFormValues>) => void;
  /** Called with true when a save is in progress, false when done. */
  onSavingChange?: (saving: boolean) => void;
};

export function MatchForm({
  matchId,
  defaultValues,
  team1Label = "Team 1",
  team2Label = "Team 2",
  idPrefix = "match",
  locationOptions = [],
  formId = "match-form",
  onSave,
  onSavingChange,
}: Props) {
  const { t, locale } = useLocale();
  const a = t.adminPage;
  const mo = a.matches.modal;

  const [values, setValues] = useState<MatchFormValues>(() => {
    let merged = { ...EMPTY, ...defaultValues };
    if (
      !("team1Withdrawn" in (defaultValues ?? {})) &&
      !("team2Withdrawn" in (defaultValues ?? {}))
    ) {
      merged = { ...merged, ...deriveWithdrawn(merged) };
    }
    // Only auto-derive for new matches (no stored status from DB).
    // Existing matches show the DB status on open; auto-derive runs on field changes.
    if (!defaultValues?.matchStatus) {
      merged = { ...merged, matchStatus: deriveStatus(merged) };
    }
    return merged;
  });
  const [error, setError] = useState<string | null>(null);

  function update(updates: Partial<MatchFormValues>) {
    setValues((prev) => {
      const next = { ...prev, ...updates };
      if (!("matchStatus" in updates) && next.matchStatus !== "Cancelled") {
        next.matchStatus = deriveStatus(next);
      }
      return next;
    });
  }

  function handleTeam1Withdrawn(checked: boolean) {
    update(
      checked
        ? { team1Withdrawn: true, team2Withdrawn: false, ...withdrawnScores(2) }
        : { team1Withdrawn: false },
    );
  }

  function handleTeam2Withdrawn(checked: boolean) {
    update(
      checked
        ? { team2Withdrawn: true, team1Withdrawn: false, ...withdrawnScores(1) }
        : { team2Withdrawn: false },
    );
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSavingChange?.(true);
    setError(null);
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchStatus: values.matchStatus,
        date: values.date || null,
        time: values.time || null,
        location: values.location || null,
        comment: values.comment || null,
        ball: values.ball,
        set1ScoreTeam1: values.set1T1 || null,
        set2ScoreTeam1: values.set2T1 || null,
        set3ScoreTeam1: values.set3T1 || null,
        set1ScoreTeam2: values.set1T2 || null,
        set2ScoreTeam2: values.set2T2 || null,
        set3ScoreTeam2: values.set3T2 || null,
      }),
    });
    onSavingChange?.(false);
    if (!res.ok) {
      setError("Save failed");
      return;
    }
    onSave(values);
  }

  const statusChipOptions = Object.entries(MATCH_STATUS_LABELS).map(
    ([key, labels]) => ({
      value: labels.en,
      label: labels[locale],
      chipClassName: `match-status-chip-${key}`,
    }),
  );

  return (
    <form
      id={formId}
      onSubmit={handleSave}
      className="flex flex-col gap-[var(--section-gap)]"
    >
      {/* Match Status */}
      <div className="flex flex-col gap-[var(--content-gap)]">
        <Field
          variant="select"
          id={`${idPrefix}-status`}
          label={mo.matchStatus}
          value={values.matchStatus}
          onChange={(e) =>
            update({ matchStatus: (e.target as HTMLSelectElement).value })
          }
          chipOptions={statusChipOptions}
        />

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            variant="datepicker"
            id={`${idPrefix}-date`}
            label={mo.date}
            value={values.date}
            onChange={(date) => update({ date })}
            wrapperClassName="min-w-0 overflow-hidden"
          />
          <Field
            variant="timepicker"
            id={`${idPrefix}-time`}
            label={mo.time}
            value={values.time}
            onChange={(time) => update({ time })}
            wrapperClassName="min-w-0 overflow-hidden"
          />
        </div>

        {/* Location */}
        <Field<string>
          variant="combobox"
          id={`${idPrefix}-loc`}
          label={mo.location}
          value={values.location}
          onValueChange={(v) => update({ location: v })}
          loadOptions={(q) =>
            Promise.resolve(
              locationOptions.filter(
                (l) =>
                  !q.trim() || l.toLowerCase().includes(q.trim().toLowerCase()),
              ),
            )
          }
          onSelect={(loc) => update({ location: loc })}
          getOptionKey={(l) => l}
          getOptionLabel={(l) => l}
        />
      </div>
      <Divider />
      {/* Scores */}
      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
          {mo.scoresSection}
        </p>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 items-center">
          {/* Header: team names */}
          <span />
          <span className="flex flex-col text-xs font-medium text-[var(--color-text-primary)] leading-snug min-w-0">
            {team1Label.split(" / ").map((name, i) => (
              <span key={i}>{name}</span>
            ))}
          </span>
          <span className="flex flex-col text-xs font-medium text-[var(--color-text-primary)] leading-snug min-w-0">
            {team2Label.split(" / ").map((name, i) => (
              <span key={i}>{name}</span>
            ))}
          </span>
          {/* Set 1 */}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {mo.set1}
          </span>
          <Field
            variant="number"
            id={`${idPrefix}-s1t1`}
            value={values.set1T1}
            onChange={(e) => update({ set1T1: e.target.value })}
          />
          <Field
            variant="number"
            id={`${idPrefix}-s1t2`}
            value={values.set1T2}
            onChange={(e) => update({ set1T2: e.target.value })}
          />
          {/* Set 2 */}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {mo.set2}
          </span>
          <Field
            variant="number"
            id={`${idPrefix}-s2t1`}
            value={values.set2T1}
            onChange={(e) => update({ set2T1: e.target.value })}
          />
          <Field
            variant="number"
            id={`${idPrefix}-s2t2`}
            value={values.set2T2}
            onChange={(e) => update({ set2T2: e.target.value })}
          />
          {/* Set 3 */}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {mo.set3}
          </span>
          <Field
            variant="number"
            id={`${idPrefix}-s3t1`}
            value={values.set3T1}
            onChange={(e) => update({ set3T1: e.target.value })}
          />
          <Field
            variant="number"
            id={`${idPrefix}-s3t2`}
            value={values.set3T2}
            onChange={(e) => update({ set3T2: e.target.value })}
          />
          {/* Walkover */}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {mo.walkover}
          </span>
          <div className="h-[var(--button-height-medium)] flex items-center justify-center">
            <Checkbox
              id={`${idPrefix}-t1wd`}
              checked={values.team1Withdrawn}
              onChange={(e) => handleTeam1Withdrawn(e.target.checked)}
            />
          </div>
          <div className="h-[var(--button-height-medium)] flex items-center justify-center">
            <Checkbox
              id={`${idPrefix}-t2wd`}
              checked={values.team2Withdrawn}
              onChange={(e) => handleTeam2Withdrawn(e.target.checked)}
            />
          </div>
        </div>
      </div>

      <Divider />
      <div className="flex flex-col gap-[var(--content-gap)]">
        {/* Ball */}
        {(() => {
          const ballOptions = [
            ...team1Label.split(" / "),
            ...team2Label.split(" / "),
          ].filter(Boolean);
          return (
            <Field
              variant="select"
              id={`${idPrefix}-ball`}
              label={mo.ball}
              value={values.ball ?? ""}
              onChange={(e) => {
                update({ ball: (e.target as HTMLSelectElement).value || null });
              }}
            >
              <option value="" disabled hidden />
              {ballOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Field>
          );
        })()}

        {/* Comment */}
        <Field
          variant="textarea"
          id={`${idPrefix}-comment`}
          label={mo.comment}
          value={values.comment}
          onChange={(e) =>
            update({ comment: (e.target as HTMLTextAreaElement).value })
          }
          rows={2}
        />
        {error && (
          <p className="text-sm text-[var(--color-status-error)]">{error}</p>
        )}
      </div>
    </form>
  );
}
