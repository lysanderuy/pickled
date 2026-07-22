import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-3xl font-semibold">starter-stack</h1>
      <p className="max-w-md text-sm text-foreground/70">
        Next.js + Supabase + Drizzle + Zod boilerplate. Replace this page with your app&apos;s
        landing page.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-foreground/5"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
