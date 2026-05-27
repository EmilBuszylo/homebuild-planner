import { computeStageCost } from "./compute-costs";
import { scheduleTimeline } from "./schedule-timeline";
import { filterStages } from "./stage-filter";
import type {
  PlanStageResultInput,
  QuestionnaireResponsesMap,
  StageWithModifiers,
} from "./types";

export function generatePlanResults(
  stagesWithModifiers: StageWithModifiers[],
  responses: QuestionnaireResponsesMap,
): PlanStageResultInput[] {
  const included = filterStages(stagesWithModifiers, responses);
  const timings = scheduleTimeline(included);
  const timingBySlug = new Map(timings.map((t) => [t.stageSlug, t]));

  return included
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => {
      const timing = timingBySlug.get(stage.slug);
      return {
        stageSlug: stage.slug,
        estimatedCost: computeStageCost(stage, responses),
        startDay: timing?.startDay ?? 0,
        durationDays: timing?.durationDays ?? 0,
        sortOrder: stage.sortOrder,
      };
    });
}

export type { PlanStageResultInput, QuestionnaireResponsesMap, StageWithModifiers };
