"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { PageContainer } from "@/app/components/PageContainer";
import { Input } from "@/app/components/ui/Input";
import { Label } from "@/app/components/ui/Label";
import { Button } from "@/app/components/ui/Button";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale === "ko" ? "ko" : "en";
  const localePrefix = locale === "ko" ? "/ko" : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "authenticated") {
    router.push(`${localePrefix}/admin`);
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(locale === "ko" ? "이메일 또는 비밀번호가 올바르지 않습니다." : "Invalid email or password.");
      } else {
        router.push(`${localePrefix}/admin`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h1 className="text-h1 m-0 text-[var(--color-text-primary)]">
            {locale === "ko" ? "관리자 로그인" : "Admin sign in"}
          </h1>
          {error ? (
            <div className="rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
              {error}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="login-email">
              {locale === "ko" ? "이메일" : "Email"}
            </Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">
              {locale === "ko" ? "비밀번호" : "Password"}
            </Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading
                ? locale === "ko" ? "로그인 중…" : "Signing in…"
                : locale === "ko" ? "로그인" : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
