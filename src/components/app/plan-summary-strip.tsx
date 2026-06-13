import { KPI_LABELS } from "@/lib/copy/orientational";
import { formatPlDate } from "@/lib/format/date";
import { formatPln } from "@/lib/format/currency";
import type { PlanResultsDto } from "@/lib/plan-results";

type PlanSummaryStripProps = {
  results: PlanResultsDto;
};

export function PlanSummaryStrip({ results }: PlanSummaryStripProps) {
  const stageCount = results.stages.length;
  const stageLabel =
    stageCount === 1
      ? "1 etap"
      : stageCount < 5
        ? `${stageCount} etapy`
        : `${stageCount} etapów`;

  return (
    <div className="space-y-3">
    <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3 sm:p-5">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {KPI_LABELS.totalCost}
        </p>
        <p className="text-2xl font-semibold tracking-tight">
          {formatPln(results.totalCost)}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {KPI_LABELS.plannedStart}
        </p>
        <p className="text-lg font-medium">
          {results.keyDate ? formatPlDate(results.keyDate) : "—"}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {KPI_LABELS.stageCount}
        </p>
        <p className="text-lg font-medium">{stageLabel}</p>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{KPI_LABELS.planScope}:</span>{" "}
      {results.planScopeLabel}
    </p>
    </div>
  );
}
