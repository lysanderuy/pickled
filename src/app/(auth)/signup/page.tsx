"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { signUpSchema } from "@/validators/auth.validator";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Email confirmation disabled in Supabase -> session is immediate.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setLoading(false);
    setSubmittedEmail(parsed.data.email);
    setEmailSent(true);
  }

  async function handleResend() {
    if (!submittedEmail) return;

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: submittedEmail,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    });

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setError(null);
    setResent(true);
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-foreground/70">
          We sent you a confirmation link. Click it to finish creating your account.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {resent ? (
          <p className="text-sm text-foreground/70">Confirmation email sent again.</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm underline hover:text-foreground/70"
          >
            Didn&apos;t get it? Resend
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create account</h1>

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
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href="/login" className="underline hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
