"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/validators/auth.validator";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${location.origin}/api/auth/callback?next=/reset-password`,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-foreground/70">
          If an account exists for that email, we sent a password reset link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="text-sm text-foreground/70">
        Enter your email and we&apos;ll send you a reset link.
      </p>

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

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-foreground/70">
        Remembered it?{" "}
        <Link href="/login" className="underline hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
