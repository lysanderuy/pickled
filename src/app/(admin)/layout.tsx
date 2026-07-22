import { redirect } from "next/navigation";

import { AdminNav } from "@/components/shared/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen w-full">
      <AdminNav />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
