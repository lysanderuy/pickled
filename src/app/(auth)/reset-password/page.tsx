import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

// Arrives from the recovery email link with a session already set by
// /api/auth/callback. Re-checked since direct navigation can bypass the proxy.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ResetPasswordForm />;
}
