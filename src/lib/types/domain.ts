export {
  InvestmentState,
  BuildStandard,
  InsulationLevel,
  QuestionType,
} from "@prisma/client";

export type {
  QuestionDefinition,
  ConstructionStage,
  StageCostModifier,
  Plan,
  PlanVersion,
  QuestionnaireResponse,
  PlanStageResult,
} from "@prisma/client";

export interface StageEstimate {
  stageSlug: string;
  stageName: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
}

export interface EstimationResult {
  stages: StageEstimate[];
  totalCost: number;
  totalDurationDays: number;
}
