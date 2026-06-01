import { AppPageShell } from "@/components/app/app-page-shell";

export default function DashboardLoading() {
  return (
    <AppPageShell className="animate-pulse">
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted sm:h-9" />
          <div className="h-4 w-56 rounded-md bg-muted" />
          <div className="h-4 w-full max-w-2xl rounded-md bg-muted" />
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-2">
            <div className="h-5 w-52 rounded-md bg-muted" />
            <div className="h-4 w-64 rounded-md bg-muted" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-7 w-32 rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="h-10 w-full rounded-md bg-muted sm:w-48" />
            <div className="h-10 w-full rounded-md bg-muted sm:w-40" />
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
