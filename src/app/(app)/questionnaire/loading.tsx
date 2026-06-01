import { AppPageShell } from "@/components/app/app-page-shell";

export default function QuestionnaireLoading() {
  return (
    <AppPageShell width="narrow" className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-56 rounded-md bg-muted sm:h-9" />
        <div className="h-4 w-full max-w-md rounded-md bg-muted" />
      </div>
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="flex justify-between gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-3 flex-1 rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-lg border p-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-10 w-full rounded-md bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <div className="h-10 w-full rounded-md bg-muted sm:w-28" />
        </div>
      </div>
    </AppPageShell>
  );
}
