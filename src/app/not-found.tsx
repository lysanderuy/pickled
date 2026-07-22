import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-sm font-medium text-foreground/50">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-foreground/70">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Go home
      </Link>
    </main>
  );
}
