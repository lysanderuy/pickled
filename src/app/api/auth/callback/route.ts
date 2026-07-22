import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Auth callback — target of email confirmation links and OAuth redirects.
// Exchanges the one-time code for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Only allow same-origin relative paths — reject protocol-relative (//evil)
  // and absolute URLs so the redirect target can't be attacker-controlled.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
