"use client";

import { Field } from "@/app/components/ui/Field";
import { MATCH_STATUS_LABELS } from "@/lib/matches";

export type MatchFormValues = {
  matchStatus: string;
  date: string;
  time: string;
  location: string;
  comment: string;
  set1T1: string; set2T1: string; set3T1: string;
  set1T2: string; set2T2: string; set3T2: string;
};

type Props = {
  values: MatchFormValues;
  onChange: (updates: Partial<MatchFormValues>) => void;
  team1Label?: string;
  team2Label?: string;
  idPrefix?: string;
  locationOptions?: string[];
};

export function MatchForm({
  values,
  onChange,
  team1Label = "Team 1",
  team2Label = "Team 2",
  idPrefix = "match",
  locationOptions = [],
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <span className="font-medium">{team1Label}</span>
        <span className="text-xs opacity-60">vs</span>
        <span className="font-medium">{team2Label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field variant="date" id={`${idPrefix}-date`} label="Date" value={values.date} onChange={(e) => onChange({ date: e.target.value })} />
        <Field variant="time" id={`${idPrefix}-time`} label="Time" value={values.time} onChange={(e) => onChange({ time: e.target.value })} />
      </div>
      <Field<string>
        variant="combobox"
        id={`${idPrefix}-loc`}
        label="Location"
        value={values.location}
        onValueChange={(v) => onChange({ location: v })}
        loadOptions={(q) =>
          Promise.resolve(
            locationOptions.filter((l) => !q.trim() || l.toLowerCase().includes(q.trim().toLowerCase()))
          )
        }
        onSelect={(loc) => onChange({ location: loc })}
        getOptionKey={(l) => l}
        getOptionLabel={(l) => l}
      />
      <Field
        variant="select"
        id={`${idPrefix}-status`}
        label="Match status"
        value={values.matchStatus}
        onChange={(e) => onChange({ matchStatus: (e.target as HTMLSelectElement).value })}
      >
        {Object.entries(MATCH_STATUS_LABELS).map(([key, { en }]) => (
          <option key={key} value={en}>{en}</option>
        ))}
      </Field>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">Scores</p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1">
          <span className="text-xs text-center text-[var(--color-text-secondary)]">Set 1</span>
          <span className="text-xs text-center text-[var(--color-text-secondary)]">Set 2</span>
          <span className="text-xs text-center text-[var(--color-text-secondary)]">Set 3</span>
          <Field variant="text" id={`${idPrefix}-s1t1`} value={values.set1T1} onChange={(e) => onChange({ set1T1: e.target.value })} placeholder={team1Label} />
          <Field variant="text" id={`${idPrefix}-s2t1`} value={values.set2T1} onChange={(e) => onChange({ set2T1: e.target.value })} placeholder={team1Label} />
          <Field variant="text" id={`${idPrefix}-s3t1`} value={values.set3T1} onChange={(e) => onChange({ set3T1: e.target.value })} placeholder={team1Label} />
          <Field variant="text" id={`${idPrefix}-s1t2`} value={values.set1T2} onChange={(e) => onChange({ set1T2: e.target.value })} placeholder={team2Label} />
          <Field variant="text" id={`${idPrefix}-s2t2`} value={values.set2T2} onChange={(e) => onChange({ set2T2: e.target.value })} placeholder={team2Label} />
          <Field variant="text" id={`${idPrefix}-s3t2`} value={values.set3T2} onChange={(e) => onChange({ set3T2: e.target.value })} placeholder={team2Label} />
        </div>
      </div>
      <Field
        variant="textarea"
        id={`${idPrefix}-comment`}
        label="Comment"
        value={values.comment}
        onChange={(e) => onChange({ comment: (e.target as HTMLTextAreaElement).value })}
        rows={2}
      />
    </div>
  );
}
