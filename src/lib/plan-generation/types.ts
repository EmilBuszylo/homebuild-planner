import type {
  ConstructionStage,
  StageCostModifier,
} from "@/lib/types/domain";

export type QuestionnaireResponsesMap = Record<string, string>;

export type StageWithModifiers = ConstructionStage & {
  costModifiers: StageCostModifier[];
};

export type PlanStageResultInput = {
  stageSlug: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
  sortOrder: number;
};
