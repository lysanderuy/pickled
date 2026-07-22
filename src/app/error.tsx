"use client";

import { useEffect } from "react";

// Segment error boundary — catches render/data errors below the root layout.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-foreground/70">
        An unexpected error occurred. Try again, or come back later.
      </p>
      {error.digest && <p className="text-xs text-foreground/50">Error ID: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
