"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { signInSchema } from "@/validators/auth.validator";

// useSearchParams requires a Suspense boundary above it.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // Errors passed by /api/auth/callback (e.g. expired confirmation link).
  const callbackError = useSearchParams().get("error");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const displayError = error ?? (resent ? null : callbackError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnconfirmedEmail(null);
    setResent(false);

    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);

    if (authError) {
      setLoading(false);
      if (authError.code === "email_not_confirmed") {
        setUnconfirmedEmail(parsed.data.email);
      }
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResend() {
    if (!unconfirmedEmail) return;

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    });

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setError(null);
    setResent(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50"
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Password</span>
            <Link
              href="/forgot-password"
              className="text-sm text-foreground/70 underline hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50"
          />
        </label>

        {displayError && <p className="text-sm text-red-500">{displayError}</p>}
        {unconfirmedEmail && !resent && (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm underline hover:text-foreground/70"
          >
            Resend confirmation email
          </button>
        )}
        {resent && (
          <p className="text-sm text-foreground/70">Confirmation email sent — check your inbox.</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-foreground/70">
        No account?{" "}
        <Link href="/signup" className="underline hover:text-foreground">
          Sign up
        </Link>
      </p>
    </div>
  );
}
