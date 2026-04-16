/**
 * Create a Player row from a display name when no matching profile exists, or
 * return an existing player matched by normalized English/Korean name (same
 * rules as partner linking). Email defaults to a deterministic placeholder.
 */
import { prisma } from "@/lib/prisma";
import {
  buildPlayerIdByPartnerNameMap,
  normPartnerName,
  resolvePartnerIdFromPartnerName,
  type PlayerNameRow,
} from "@/lib/partnerLinking";

const PLACEHOLDER_DOMAIN = "placeholder.local";

/** ASCII slug for placeholder emails: "Justin Song" → "justin.song" */
export function emailSlugFromDisplayName(name: string): string {
  const n = normPartnerName(name);
  const slug = n
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);
  return slug || "player";
}

function hasHangul(s: string): boolean {
  return /[\uAC00-\uD7AF]/.test(s);
}

/** `draw.{slug}.n@placeholder.local` — increments n if email already taken. */
export async function allocatePlaceholderEmailForName(displayName: string): Promise<string> {
  const slug = emailSlugFromDisplayName(displayName);
  for (let n = 0; n < 50; n++) {
    const email = `draw.${slug}.${n}@${PLACEHOLDER_DOMAIN}`;
    const taken = await prisma.player.findFirst({ where: { email }, select: { id: true } });
    if (!taken) return email;
  }
  return `draw.${slug}.${Date.now()}@${PLACEHOLDER_DOMAIN}`;
}

export type EnsurePlayerProfileInput = {
  /** Partner / roster name (English, Korean, or mixed). */
  displayName: string;
  /** Optional explicit English name (overrides parsing). */
  fullNameEn?: string | null;
  /** Optional Korean name. */
  fullNameKo?: string | null;
  /** If set, used instead of a placeholder (must be unique). */
  email?: string | null;
};

export type EnsurePlayerProfileResult = {
  playerId: number;
  created: boolean;
  email: string;
};

/**
 * Load all players for name matching. For hot paths, pass a preloaded `cache`.
 */
export async function ensurePlayerProfile(
  input: EnsurePlayerProfileInput,
  cache?: PlayerNameRow[]
): Promise<EnsurePlayerProfileResult> {
  const raw = normPartnerName(input.displayName);
  if (!raw) {
    throw new Error("displayName is required");
  }

  const players =
    cache ??
    (await prisma.player.findMany({
      select: { id: true, fullNameEn: true, fullNameKo: true },
    }));

  const map = buildPlayerIdByPartnerNameMap(players);
  const hit = resolvePartnerIdFromPartnerName(raw, map);
  if (hit != null) {
    const p = await prisma.player.findUnique({ where: { id: hit }, select: { email: true } });
    return { playerId: hit, created: false, email: p?.email ?? "" };
  }

  const hangul = hasHangul(raw);
  let fullNameEn: string;
  let fullNameKo: string | null;
  if (input.fullNameEn?.trim()) {
    fullNameEn = normPartnerName(input.fullNameEn);
    fullNameKo = input.fullNameKo?.trim() ? normPartnerName(input.fullNameKo) : null;
  } else if (hangul) {
    fullNameKo = normPartnerName(raw);
    fullNameEn = raw;
  } else {
    fullNameEn = raw;
    fullNameKo = input.fullNameKo?.trim() ? normPartnerName(input.fullNameKo) : null;
  }

  const emailIn =
    input.email?.trim().toLowerCase() || (await allocatePlaceholderEmailForName(fullNameEn));

  const emailTaken = await prisma.player.findFirst({ where: { email: emailIn }, select: { id: true } });
  const email = emailTaken ? await allocatePlaceholderEmailForName(fullNameEn) : emailIn;

  const created = await prisma.player.create({
    data: {
      email,
      fullNameEn,
      fullNameKo,
    },
    select: { id: true, email: true },
  });

  return { playerId: created.id, created: true, email: created.email };
}
