import { NextResponse } from "next/server";

import { emailService } from "@/services/email.service";
import { profileService } from "@/services/profile.service";
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        await sendWelcomeOnce(data.user.id, data.user.email, origin);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}

// Sends the welcome email once (this callback also fires for OAuth/recovery,
// hence the atomic claim). Best-effort — a Resend failure releases the claim.
async function sendWelcomeOnce(userId: string, email: string | undefined, origin: string) {
  if (!email) return;

  let claim;
  try {
    claim = await profileService.claimWelcomeEmail(userId);
  } catch (err) {
    console.error("Welcome email claim failed:", err);
    return;
  }
  if (!claim) return;

  try {
    await emailService.sendWelcome({
      to: email,
      name: claim.displayName ?? email,
      dashboardUrl: `${origin}/dashboard`,
    });
  } catch (err) {
    await profileService.releaseWelcomeClaim(userId, claim.claimedAt);
    console.error("Welcome email failed:", err);
  }
}
