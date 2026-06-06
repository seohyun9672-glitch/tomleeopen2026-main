import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const admin = await prisma.adminUser.findUnique({ where: { email } });
        if (!admin) return null;

        if (!admin.passwordHash) {
          // First login — set the entered password, activate the account
          const hash = await bcrypt.hash(credentials.password, 12);
          await prisma.adminUser.update({ where: { email }, data: { passwordHash: hash, active: true } });
          return { id: admin.id, email: admin.email, role: "admin" };
        }

        if (!admin.active) return null;
        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;
        return { id: admin.id, email: admin.email, role: "admin" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.email = user.email ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        const admin = await prisma.adminUser.findUnique({
          where: { email: token.email as string },
          select: { active: true },
        });
        if (!admin?.active) return { ...session, user: undefined };
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
};
