/**
 * Admin authentication: allowlist + `AdminUser` records (passwords), and NextAuth session config.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// ─── Allowlist & users (used by login, setup API, and NextAuth `authorize`) ─────

export const ALLOWED_ADMIN_EMAILS = [
  "hongtaku@gmail.com",
  "tom@tomleedental.com",
  "seanlee.cons@gmail.com",
  "seohyun9672@gmail.com",
  "gg867600@gmail.com",
  "jiuncanada12@gmail.com",
  "jihye.sophiee.kim@gmail.com",
  "bright91@gmail.com",
].map((e) => e.trim().toLowerCase());

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedAdminEmail(email: string): boolean {
  return ALLOWED_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export async function getAdminUserByEmail(email: string) {
  return prisma.adminUser.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

/**
 * Returns { allowed, registered }.
 * An email is allowed if it exists in the AdminUser table (stub or full) or the hardcoded allowlist.
 * Registered means the user has set a password.
 */
export async function checkAdminEmail(email: string): Promise<{ allowed: boolean; registered: boolean }> {
  const normalized = normalizeEmail(email);
  const user = await prisma.adminUser.findUnique({ where: { email: normalized } });
  if (user) return { allowed: true, registered: !!user.passwordHash };
  return { allowed: ALLOWED_ADMIN_EMAILS.includes(normalized), registered: false };
}

export async function createAdminUser(email: string, password: string): Promise<{ ok: true } | { error: string }> {
  const normalized = normalizeEmail(email);
  const existing = await prisma.adminUser.findUnique({ where: { email: normalized } });

  // Allow if in allowlist or already has a stub record (added by admin via UI)
  if (!existing && !ALLOWED_ADMIN_EMAILS.includes(normalized)) {
    return { error: "This email is not authorized for admin access." };
  }
  if (existing?.passwordHash) {
    return { error: "An account with this email already exists. Sign in with your password." };
  }
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  const { hash } = await import("bcryptjs");
  const passwordHash = await hash(password, 10);
  if (existing) {
    await prisma.adminUser.update({
      where: { email: normalized },
      data: { passwordHash, active: true },
    });
  } else {
    await prisma.adminUser.create({
      data: { email: normalized, passwordHash },
    });
  }
  return { ok: true };
}

export async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
  const user = await getAdminUserByEmail(email);
  if (!user) return false;
  const { compare } = await import("bcryptjs");
  return compare(password, user.passwordHash);
}

export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, createdAt: true },
  });
}

// ─── NextAuth (Credentials → same checks as above) ─────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await getAdminUserByEmail(email);
        if (!user || !user.active || !user.passwordHash) return null;
        const valid = await verifyAdminPassword(email, password);
        if (!valid) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? undefined;
        session.user.email = (token.email as string) ?? undefined;
      }
      return session;
    },
  },
};
