import type { PlanResultsStageDto } from "@/lib/plan-results";

export function sortPlanStagesChronologically(
  stages: PlanResultsStageDto[],
): PlanResultsStageDto[] {
  const indexed = stages.map((stage, index) => ({
    stage,
    index,
  }));

  indexed.sort((a, b) => {
    if (a.stage.startDay !== b.stage.startDay) {
      return a.stage.startDay - b.stage.startDay;
    }
    return a.index - b.index;
  });

  return indexed.map((entry) => entry.stage);
}

