import { formatPlanScope } from "@/lib/format/investment-state-label";
import type {
  PlanResultsDto,
  PlanStageNoteDto,
} from "@/lib/validations/plan-results";

export type StageDefSummary = {
  slug: string;
  name: string;
  category: string;
};

export type AssemblePlanResultsVersion = {
  refinementApplied: boolean;
  benchmarkFetchedAt: Date | null;
  benchmarkSourceName: string | null;
  stageResults: Array<{
    stageSlug: string;
    estimatedCost: number;
    startDay: number;
    durationDays: number;
  }>;
  responses: Array<{ questionSlug: string; value: string }>;
};

export type AssemblePlanResultsInput = {
  planId: string;
  version: AssemblePlanResultsVersion;
  stageDefsBySlug: Map<string, StageDefSummary>;
  stageNotes: Record<string, PlanStageNoteDto>;
};

export function assemblePlanResultsDto(
  input: AssemblePlanResultsInput,
): PlanResultsDto {
  const { planId, version, stageDefsBySlug, stageNotes } = input;

  const keyDate =
    version.responses.find((r) => r.questionSlug === "key_date")?.value ?? "";
  const startingState =
    version.responses.find((r) => r.questionSlug === "starting_state")
      ?.value ?? "";
  const targetState =
    version.responses.find((r) => r.questionSlug === "investment_state")
      ?.value ?? "";
  const planScopeLabel =
    startingState && targetState
      ? formatPlanScope(startingState, targetState)
      : "—";

  const stages = version.stageResults.map((result) => {
    const def = stageDefsBySlug.get(result.stageSlug);
    return {
      stageSlug: result.stageSlug,
      name: def?.name ?? result.stageSlug,
      category: def?.category ?? "",
      estimatedCost: result.estimatedCost,
      startDay: result.startDay,
      durationDays: result.durationDays,
    };
  });

  const totalCost = stages.reduce((sum, s) => sum + s.estimatedCost, 0);

  return {
    planId,
    keyDate,
    planScopeLabel,
    totalCost,
    stages,
    stageNotes,
    refinementApplied: version.refinementApplied,
    benchmarkAsOf: version.benchmarkFetchedAt?.toISOString() ?? null,
    benchmarkSource: version.benchmarkSourceName,
  };
}
