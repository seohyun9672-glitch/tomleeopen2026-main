"use client";

import { useState } from "react";
import { Field } from "@/app/components/ui/Field";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { MATCH_STATUS_LABELS } from "@/lib/matches";
import { useLocale } from "@/lib/locale-context";

export type MatchFormValues = {
  matchStatus: string;
  date: string;
  time: string;
  location: string;
  comment: string;
  set1T1: string; set2T1: string; set3T1: string;
  set1T2: string; set2T2: string; set3T2: string;
  team1Withdrawn: boolean;
  team2Withdrawn: boolean;
};

const EMPTY: MatchFormValues = {
  matchStatus: "Scheduled", date: "", time: "", location: "", comment: "",
  set1T1: "", set2T1: "", set3T1: "", set1T2: "", set2T2: "", set3T2: "",
  team1Withdrawn: false, team2Withdrawn: false,
};

function withdrawnScores(winner: 1 | 2): Pick<MatchFormValues, "set1T1" | "set2T1" | "set3T1" | "set1T2" | "set2T2" | "set3T2"> {
  return winner === 1
    ? { set1T1: "6", set2T1: "6", set3T1: "", set1T2: "0", set2T2: "0", set3T2: "" }
    : { set1T1: "0", set2T1: "0", set3T1: "", set1T2: "6", set2T2: "6", set3T2: "" };
}

type Props = {
  matchId: string;
  defaultValues?: Partial<MatchFormValues>;
  team1Label?: string;
  team2Label?: string;
  idPrefix?: string;
  locationOptions?: string[];
  formId?: string;
  onSave: () => void;
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

  const [values, setValues] = useState<MatchFormValues>({ ...EMPTY, ...defaultValues });
  const [error, setError] = useState<string | null>(null);

  function update(updates: Partial<MatchFormValues>) {
    setValues((prev) => ({ ...prev, ...updates }));
  }

  function handleTeam1Withdrawn(checked: boolean) {
    update(checked
      ? { team1Withdrawn: true, team2Withdrawn: false, ...withdrawnScores(2) }
      : { team1Withdrawn: false });
  }

  function handleTeam2Withdrawn(checked: boolean) {
    update(checked
      ? { team2Withdrawn: true, team1Withdrawn: false, ...withdrawnScores(1) }
      : { team2Withdrawn: false });
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSavingChange?.(true);
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
        set1ScoreTeam1: values.set1T1 || null,
        set2ScoreTeam1: values.set2T1 || null,
        set3ScoreTeam1: values.set3T1 || null,
        set1ScoreTeam2: values.set1T2 || null,
        set2ScoreTeam2: values.set2T2 || null,
        set3ScoreTeam2: values.set3T2 || null,
      }),
    });
    onSavingChange?.(false);
    onSavingChange?.(false);
    if (!res.ok) { setError("Save failed"); return; }
    onSave();
  }

  return (
    <form id={formId} onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field variant="date" id={`${idPrefix}-date`} label={mo.date} value={values.date} onChange={(e) => update({ date: e.target.value })} />
        <Field variant="time" id={`${idPrefix}-time`} label={mo.time} value={values.time} onChange={(e) => update({ time: e.target.value })} />
      </div>
      <Field<string>
        variant="combobox"
        id={`${idPrefix}-loc`}
        label={mo.location}
        value={values.location}
        onValueChange={(v) => update({ location: v })}
        loadOptions={(q) =>
          Promise.resolve(
            locationOptions.filter((l) => !q.trim() || l.toLowerCase().includes(q.trim().toLowerCase()))
          )
        }
        onSelect={(loc) => update({ location: loc })}
        getOptionKey={(l) => l}
        getOptionLabel={(l) => l}
      />
      <Field
        variant="select"
        id={`${idPrefix}-status`}
        label={mo.matchStatus}
        value={values.matchStatus}
        onChange={(e) => update({ matchStatus: (e.target as HTMLSelectElement).value })}
      >
        {Object.entries(MATCH_STATUS_LABELS).map(([key, labels]) => (
          <option key={key} value={labels.en}>{labels[locale]}</option>
        ))}
      </Field>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{mo.scoresSection}</p>
        {/*
          Transposed grid: teams as columns, sets as rows.
          col layout: [row-label | team-1 | team-2]
          This keeps score inputs in predictably-sized columns and gives
          team names the full column width — works well at any modal width.
        */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 items-center">
          {/* Header: team names */}
          <span />
          <span className="flex flex-col text-xs font-medium text-[var(--color-text-primary)] leading-snug min-w-0">
            {team1Label.split(" / ").map((name, i) => <span key={i}>{name}</span>)}
          </span>
          <span className="flex flex-col text-xs font-medium text-[var(--color-text-primary)] leading-snug min-w-0">
            {team2Label.split(" / ").map((name, i) => <span key={i}>{name}</span>)}
          </span>
          {/* Set 1 */}
          <span className="text-xs text-[var(--color-text-secondary)]">{mo.set1}</span>
          <Field variant="number" id={`${idPrefix}-s1t1`} value={values.set1T1} onChange={(e) => update({ set1T1: e.target.value })} />
          <Field variant="number" id={`${idPrefix}-s1t2`} value={values.set1T2} onChange={(e) => update({ set1T2: e.target.value })} />
          {/* Set 2 */}
          <span className="text-xs text-[var(--color-text-secondary)]">{mo.set2}</span>
          <Field variant="number" id={`${idPrefix}-s2t1`} value={values.set2T1} onChange={(e) => update({ set2T1: e.target.value })} />
          <Field variant="number" id={`${idPrefix}-s2t2`} value={values.set2T2} onChange={(e) => update({ set2T2: e.target.value })} />
          {/* Set 3 */}
          <span className="text-xs text-[var(--color-text-secondary)]">{mo.set3}</span>
          <Field variant="number" id={`${idPrefix}-s3t1`} value={values.set3T1} onChange={(e) => update({ set3T1: e.target.value })} />
          <Field variant="number" id={`${idPrefix}-s3t2`} value={values.set3T2} onChange={(e) => update({ set3T2: e.target.value })} />
          {/* Walkover */}
          <span className="text-xs text-[var(--color-text-secondary)]">{mo.walkover}</span>
          <div className="flex justify-center">
            <Checkbox id={`${idPrefix}-t1wd`} checked={values.team1Withdrawn} onChange={(e) => handleTeam1Withdrawn(e.target.checked)} />
          </div>
          <div className="flex justify-center">
            <Checkbox id={`${idPrefix}-t2wd`} checked={values.team2Withdrawn} onChange={(e) => handleTeam2Withdrawn(e.target.checked)} />
          </div>
        </div>
      </div>
      <Field
        variant="textarea"
        id={`${idPrefix}-comment`}
        label={mo.comment}
        value={values.comment}
        onChange={(e) => update({ comment: (e.target as HTMLTextAreaElement).value })}
        rows={2}
      />
      {error && <p className="text-sm text-[var(--color-status-error)]">{error}</p>}
    </form>
  );
}
