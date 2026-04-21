"use client";

import { useEffect, useMemo, useState } from "react";
import { NTRP_LEVELS } from "@/lib/ntrp";
import { normalizeNtrpForStorage } from "@/lib/ntrpFormat";
import { Field } from "@/app/components/ui/Field";
import { Chip } from "@/app/components/ui/Chip";
import { Label } from "@/app/components/ui/Label";
import { clubChipClass } from "@/lib/clubs";
import { Modal } from "@/app/components/ui/Modal";
import { useLocale } from "@/lib/locale-context";
import type { PlayerTableRow } from "../../tables/PlayersTable";

const FORM_SURFACE_CLASS =
  "bg-[var(--form-surface-bg)] text-[var(--color-text-primary)] [--section-text:var(--color-text-primary)] [--input-text:var(--color-text-primary)] [--input-bg:var(--form-surface-bg)] [--input-focus-border:var(--outline-blue-focus)] [--input-focus-ring:var(--outline-blue-focus-ring)]";

const ADMIN_EDIT_PLAYER_FORM_ID = "admin-edit-player-form";

const EDIT_CLUB_CHIP_SHELL =
  "inline-block max-w-full min-h-[1.25rem] rounded-2xl border border-[color:var(--chip-palette-ring)] px-1.5 py-0.5 text-left text-sm font-medium leading-snug whitespace-normal [overflow-wrap:break-word] align-middle [box-decoration-break:clone]";
const editClubChipClass = (code: string) => `${EDIT_CLUB_CHIP_SHELL} ${clubChipClass(code)}`;

function ntrpTableDisplayToSelectValue(display: string | null | undefined): string {
  const v = display?.trim();
  if (!v || v === "—") return "";
  const stored = normalizeNtrpForStorage(v);
  if (!stored) return "";
  return (NTRP_LEVELS as readonly string[]).includes(stored) ? stored : "";
}

type EditPlayerModalProps = {
  player: PlayerTableRow;
  onClose: () => void;
  onRequestDelete: () => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setError: (v: string) => void;
};

export function EditPlayerModal({
  player,
  onClose,
  onRequestDelete,
  onSaved,
  saving,
  setSaving,
  setError,
}: EditPlayerModalProps) {
  const { t } = useLocale();
  const rf = t.registrationForm.fields;
  const regOpts = t.registrationForm.options;

  const [fullNameEn, setFullNameEn] = useState(player.fullNameEn);
  const [fullNameKo, setFullNameKo] = useState(player.fullNameKo ?? "");
  const [email, setEmail] = useState(player.email ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [ntrp, setNtrp] = useState(() => ntrpTableDisplayToSelectValue(player.ntrp));
  const [editClubs, setEditClubs] = useState<string[]>(() => [...player.clubs]);
  const [clubOptions, setClubOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((clubs: { code: string }[]) => setClubOptions(clubs.map((c) => c.code)))
      .catch(() => setClubOptions([]));
  }, []);

  const clubSelectedOptions = useMemo(
    () => editClubs.map((code) => ({ id: code, label: code })),
    [editClubs]
  );

  const clubAvailableOptions = useMemo(
    () => clubOptions.map((code) => ({ id: code, label: code })),
    [clubOptions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameEn: fullNameEn.trim(),
          fullNameKo: fullNameKo.trim() || null,
          email: email.trim(),
          phone: phone.trim() || null,
          ntrp: ntrp.trim() ? normalizeNtrpForStorage(ntrp) : null,
          clubs: editClubs,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Update failed");
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
      title={t.adminPlayers.editTitle}
      ariaLabelledBy="edit-player-modal-title"
      secondaryAction={{
        label: t.adminPlayers.deleteEllipsis,
        onClick: onRequestDelete,
        type: "button",
        disabled: saving,
      }}
      primaryAction={{
        label: saving ? t.adminPlayers.saving : t.adminPlayers.save,
        type: "submit",
        form: ADMIN_EDIT_PLAYER_FORM_ID,
        disabled: saving,
      }}
    >
      <div className={FORM_SURFACE_CLASS}>
        <form
          id={ADMIN_EDIT_PLAYER_FORM_ID}
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-6"
        >
          <div className="md:col-span-2">
            <Label htmlFor="admin-player-name-en">{t.adminPlayers.nameEn}</Label>
            <Field
              variant="text"
              id="admin-player-name-en"
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="admin-player-name-ko">{t.adminPlayers.nameKo}</Label>
            <Field
              variant="text"
              id="admin-player-name-ko"
              value={fullNameKo}
              onChange={(e) => setFullNameKo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="admin-player-email">{t.adminPlayers.email}</Label>
            <Field
              variant="email"
              id="admin-player-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="admin-player-phone">{t.adminPlayers.phone}</Label>
            <Field
              variant="tel"
              id="admin-player-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="admin-player-ntrp">{t.adminPlayers.ntrp}</Label>
            <Field
              variant="select"
              id="admin-player-ntrp"
              value={ntrp}
              onChange={(e) => setNtrp(e.target.value)}
            >
              <option value="">{regOpts.selectLevel}</option>
              {NTRP_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Field>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="admin-player-clubs">{rf.clubs}</Label>
            <Field
              variant="multiselect"
              id="admin-player-clubs"
              selected={clubSelectedOptions}
              available={clubAvailableOptions}
              onChange={setEditClubs}
              renderChip={(o) => <Chip className={editClubChipClass(o.id)} label={o.label} />}
              placeholder={rf.searchClubsPlaceholder}
              searchable={false}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}