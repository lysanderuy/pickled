import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { z } from "zod";

import { env } from "@/lib/env";
import { emailService } from "@/services/email.service";

// Payload shape after signature verification — one-off webhook contract, not a REST
// resource, so kept inline rather than in src/validators.
const sendEmailHookPayloadSchema = z.object({
  user: z.object({ email: z.email() }),
  email_data: z.object({
    token_hash: z.string().min(1),
    redirect_to: z.string(),
    email_action_type: z.string(),
  }),
});

// Supabase's Send Email Hook: inbound webhook, not a browser call — authenticated by
// signature (below), not session cookies. Response shape is Supabase's contract, not
// ApiResponse<T>: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
export async function POST(request: Request) {
  if (!env.SEND_EMAIL_HOOK_SECRET) {
    return webhookError(
      "Email hook is not configured: set SEND_EMAIL_HOOK_SECRET (see .env.example).",
      500,
    );
  }

  // Signature is computed over the raw body — request.json() would re-serialize
  // and break verification.
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  let verifiedPayload: unknown;
  try {
    const wh = new Webhook(env.SEND_EMAIL_HOOK_SECRET.replace("v1,whsec_", ""));
    verifiedPayload = wh.verify(payload, headers);
  } catch {
    return webhookError("Invalid webhook signature.", 401);
  }

  // A valid signature only proves the bytes came from Supabase, not that the parsed
  // JSON matches the expected shape — parse it separately.
  const parsed = sendEmailHookPayloadSchema.safeParse(verifiedPayload);
  if (!parsed.success) {
    return webhookError("Invalid webhook payload.", 400);
  }

  const { user, email_data } = parsed.data;
  const { token_hash, redirect_to, email_action_type } = email_data;

  const params = new URLSearchParams({
    token: token_hash,
    type: email_action_type,
    redirect_to,
  });
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?${params.toString()}`;

  try {
    if (email_action_type === "signup") {
      await emailService.sendConfirmSignup({ to: user.email, url });
    } else if (email_action_type === "recovery") {
      await emailService.sendResetPassword({ to: user.email, url });
    } else {
      // This starter only ships templates for signup/recovery — other action types
      // (magiclink, invite, email_change, reauthentication) fall through unhandled.
      console.warn(`Unhandled email_action_type: ${email_action_type}`);
    }
  } catch (err) {
    console.error("[email-hook]", err);
    return webhookError("Failed to send email.", 500);
  }

  return NextResponse.json({});
}

function webhookError(message: string, status: number) {
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}
