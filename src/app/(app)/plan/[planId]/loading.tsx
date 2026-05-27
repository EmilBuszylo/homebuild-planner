export default function PlanLoading() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl animate-pulse flex-col gap-8 p-6 py-10">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-11 rounded-md bg-muted" />
        ))}
      </div>
      <div className="h-40 rounded-md bg-muted" />
    </div>
  );
}
