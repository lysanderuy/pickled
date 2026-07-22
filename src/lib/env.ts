import { z } from "zod";

// Lazy validation — next build imports routes before env vars exist. Server-only;
// client components must use process.env.NEXT_PUBLIC_* directly.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  // Optional: welcome/confirm/reset email need these, but the app boots without
  // them (email.service throws a clear error if you try to send unconfigured).
  RESEND_API_KEY: z.string().min(1).optional(),
  // Verified sender, e.g. "Acme <hello@mail.yourdomain.com>".
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  // Optional: rate limiting (src/lib/rate-limit.ts) needs these, but the app
  // boots without them — requests just pass through unthrottled.
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Signing secret for Supabase's Send Email Hook (format "v1,whsec_...", prefix
  // stripped before use). Gates /api/auth/email-hook — unset fails closed.
  SEND_EMAIL_HOOK_SECRET: z.string().min(1).optional(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export const env: Env = new Proxy({} as Env, {
  get(_target, key: string) {
    cached ??= envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      SEND_EMAIL_HOOK_SECRET: process.env.SEND_EMAIL_HOOK_SECRET,
    });
    return cached[key as keyof Env];
  },
});
