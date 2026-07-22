import "server-only";

import type { Staff } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { staffService } from "@/services/staff.service";

// Route-side authz helper — lives here (not in services) because it touches
// cookies via the Supabase client. Routes 401 on null; owner_admin-only
// routes additionally check `.role`.
export async function requireStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return staffService.getByAuthUserId(user.id);
}
