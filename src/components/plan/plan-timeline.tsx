import type { PlanResultsDto } from "@/lib/plan-results";
import { addDaysToIsoDate } from "@/lib/format/plan-date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlanTimelineProps = {
  results: PlanResultsDto;
};

export function PlanTimeline({ results }: PlanTimelineProps) {
  const anchorLabel = addDaysToIsoDate(results.keyDate, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Harmonogram prac</CardTitle>
        <CardDescription>
          Planowany przebieg etapów od {anchorLabel} (dzień 0)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0 border-l border-border pl-6">
          {results.stages.map((stage) => {
            const startLabel = addDaysToIsoDate(
              results.keyDate,
              stage.startDay,
            );
            const endLabel = addDaysToIsoDate(
              results.keyDate,
              stage.startDay + stage.durationDays,
            );

            return (
              <li key={stage.stageSlug} className="pb-8 last:pb-0">
                <span
                  className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-primary bg-background"
                  aria-hidden
                />
                <p className="font-medium">{stage.name}</p>
                <p className="text-muted-foreground text-sm">
                  {startLabel}
                  {stage.durationDays > 0 && (
                    <>
                      {" "}
                      — {endLabel} ({stage.durationDays}{" "}
                      {stage.durationDays === 1 ? "dzień" : "dni"})
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
