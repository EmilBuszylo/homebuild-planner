import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KPI_LABELS } from "@/lib/copy/orientational";
import { formatPlDate } from "@/lib/format/date";
import { formatPln } from "@/lib/format/currency";
import type { PlanResultsDto } from "@/lib/plan-results";
import { routes } from "@/lib/routes";

type PlanSnapshotCardProps = {
  results: PlanResultsDto;
  planCreatedAt: Date;
};

function formatPlanCreatedAt(date: Date): string {
  return formatPlDate(date);
}

export function PlanSnapshotCard({
  results,
  planCreatedAt,
}: PlanSnapshotCardProps) {
  const stageCount = results.stages.length;
  const stageLabel =
    stageCount === 1
      ? "1 etap"
      : stageCount < 5
        ? `${stageCount} etapy`
        : `${stageCount} etapów`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orientacyjne podsumowanie</CardTitle>
        <CardDescription>
          Plan utworzony {formatPlanCreatedAt(planCreatedAt)} — na podstawie
          Twojej ostatniej ankiety.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {KPI_LABELS.totalCost}
            </dt>
            <dd className="text-2xl font-semibold tracking-tight">
              {formatPln(results.totalCost)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {KPI_LABELS.plannedStart}
            </dt>
            <dd className="text-lg font-medium">
              {results.keyDate ? formatPlDate(results.keyDate) : "—"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {KPI_LABELS.stageCount}
            </dt>
            <dd className="text-lg font-medium">{stageLabel}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={routes.plan(results.planId)}>
            Zobacz kosztorys i harmonogram
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href={routes.questionnaire}>Edytuj odpowiedzi</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
