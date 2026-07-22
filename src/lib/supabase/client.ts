import { createBrowserClient } from "@supabase/ssr";

// Client Components only ("use client"). Returns a singleton — safe to call per component.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
