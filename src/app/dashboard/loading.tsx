// Example loading skeleton — replace/extend per project.
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <div className="h-8 w-40 animate-pulse rounded-md bg-foreground/10" />
      <div className="mt-6 h-4 w-64 animate-pulse rounded-md bg-foreground/10" />
    </main>
  );
}
