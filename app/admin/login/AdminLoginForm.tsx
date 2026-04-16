"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Form } from "@/app/components/ui/Form";
import { Field } from "@/app/components/ui/Field";
import { Label } from "@/app/components/ui/Label";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (needsSetup) {
        // First-time password setup
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const res = await fetch("/api/auth/admin/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
      }

      // Sign in
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!needsSetup && result?.error) {
        // Could be wrong password or no account yet — check which
        const check = await fetch("/api/auth/admin/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const checkData = await check.json();
        if (!check.ok || !checkData.allowed) {
          setError("This email is not authorized for admin access.");
          return;
        }
        if (!checkData.registered) {
          setNeedsSetup(true);
          setError("");
          return;
        }
        setError("Invalid password.");
        return;
      }

      if (result?.url) {
        router.push(result.url);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[var(--form-max-width)]">
      <Form>
        <h2 className="text-[var(--color-text-primary)]">Admin sign in</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin-email">Email</Label>
            <Field
              variant="email"
              id="admin-email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={needsSetup}
            />
          </div>
          <div>
            <Label htmlFor="admin-password">{needsSetup ? "New password" : "Password"}</Label>
            <Field
              variant="password"
              id="admin-password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={needsSetup ? 8 : undefined}
            />
            {needsSetup && (
              <p className="mt-0.5 text-xs text-[var(--color-text-primary)]">At least 8 characters.</p>
            )}
          </div>
          {needsSetup && (
            <div>
              <Label htmlFor="admin-confirm-password">Confirm password</Label>
              <Field
                variant="password"
                id="admin-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-[var(--form-field-error-text)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary-blue-900)] px-4 py-2 text-sm font-medium text-[var(--color-text-on-brand)] hover:bg-[var(--color-primary-blue-800)] disabled:opacity-50 dark:bg-[var(--color-surface-strong)] dark:text-[var(--color-text-primary)] dark:hover:bg-[var(--color-surface-strong)]"
          >
            {loading
              ? needsSetup ? "Creating account…" : "Signing in…"
              : needsSetup ? "Create account & sign in" : "Sign in"}
          </button>
        </form>
      </Form>
    </div>
  );
}
