"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/Input";
import { Label } from "@/app/components/ui/Label";
import { Button } from "@/app/components/ui/Button";
import { useLocale } from "@/lib/locale-context";

export function AdminLoginForm() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const al = t.adminLogin;
  const localePrefix = locale === "ko" ? "/ko" : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(al.invalidCredentials);
      } else {
        router.push(`${localePrefix}/admin`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8">
        <h1 className="text-h1 m-0 text-[var(--color-text-primary)]">{al.title}</h1>
        {error && (
          <div className="rounded-lg bg-[var(--color-status-error-bg-subtle)] p-3 text-sm text-[var(--color-status-error-text-strong)]">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">{t.shared.form.email}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">{t.shared.form.password}</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <Button variant="primary" type="submit" disabled={loading} className="w-full">
          {loading ? t.shared.buttons.signingIn : t.shared.buttons.signIn}
        </Button>
      </form>
    </div>
  );
}
