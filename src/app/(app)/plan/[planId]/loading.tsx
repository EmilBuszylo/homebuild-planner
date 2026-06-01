import { AppPageShell } from "@/components/app/app-page-shell";

export default function PlanLoading() {
  return (
    <AppPageShell paddingY="loose" className="animate-pulse">
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-md bg-muted sm:h-9" />
          <div className="h-4 w-full max-w-md rounded-md bg-muted" />
        </div>
        <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3 sm:p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-7 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-4 w-full max-w-2xl rounded-md bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-11 rounded-md bg-muted" />
          ))}
        </div>
        <div className="overflow-hidden rounded-md border">
          <div className="flex">
            <div className="w-36 shrink-0 space-y-2 border-r bg-muted/30 p-2">
              <div className="h-8 rounded bg-muted" />
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-9 rounded bg-muted" />
              ))}
            </div>
            <div className="flex-1 space-y-2 p-2">
              <div className="h-8 rounded bg-muted" />
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-9 rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
