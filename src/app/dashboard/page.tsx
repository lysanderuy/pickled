import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Example protected page — replace/extend per project.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:bg-foreground/5"
          >
            Sign out
          </button>
        </form>
      </div>

      <p className="mt-6 text-sm text-foreground/70">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
      </p>
    </main>
  );
}
