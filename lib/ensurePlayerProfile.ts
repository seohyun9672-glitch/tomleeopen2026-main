import { prisma } from "@/lib/prisma";

const PLACEHOLDER_DOMAIN = "@email.com";

function normName(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** ASCII slug for placeholder emails: "Justin Song" → "justin.song" */
export function emailSlugFromDisplayName(name: string): string {
  const n = normName(name);
  const slug = n
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);
  return slug || "player";
}

function hasHangul(s: string): boolean {
  return /[가-힯]/.test(s);
}

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
  displayName: string;
  fullNameEn?: string | null;
  fullNameKo?: string | null;
  email?: string | null;
};

export type EnsurePlayerProfileResult = {
  playerId: number;
  created: boolean;
  email: string;
};

export async function ensurePlayerProfile(
  input: EnsurePlayerProfileInput
): Promise<EnsurePlayerProfileResult> {
  const raw = normName(input.displayName);
  if (!raw) throw new Error("displayName is required");

  const existing = await prisma.player.findFirst({
    where: {
      OR: [
        { fullNameEn: { equals: raw, mode: "insensitive" } },
        { fullNameKo: { equals: raw, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true },
  });
  if (existing) return { playerId: existing.id, created: false, email: existing.email };

  const hangul = hasHangul(raw);
  let fullNameEn: string;
  let fullNameKo: string | null;
  if (input.fullNameEn?.trim()) {
    fullNameEn = normName(input.fullNameEn);
    fullNameKo = input.fullNameKo?.trim() ? normName(input.fullNameKo) : null;
  } else if (hangul) {
    fullNameKo = normName(raw);
    fullNameEn = raw;
  } else {
    fullNameEn = raw;
    fullNameKo = input.fullNameKo?.trim() ? normName(input.fullNameKo) : null;
  }

  const emailIn =
    input.email?.trim().toLowerCase() || (await allocatePlaceholderEmailForName(fullNameEn));
  const emailTaken = await prisma.player.findFirst({ where: { email: emailIn }, select: { id: true } });
  const email = emailTaken ? await allocatePlaceholderEmailForName(fullNameEn) : emailIn;

  const created = await prisma.player.create({
    data: { email, fullNameEn, fullNameKo },
    select: { id: true, email: true },
  });

  return { playerId: created.id, created: true, email: created.email };
}
