export default function PlanLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl animate-pulse flex-col gap-8 p-6 py-10">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted" />
      </div>
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
  );
}
