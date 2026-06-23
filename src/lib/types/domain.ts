/** Kanoniczny union stanów inwestycji — wartości zgodne z Prisma enum i Zod. */
export type DomainInvestmentState =
  | "FROM_SCRATCH"
  | "FOUNDATIONS"
  | "OPEN_SHELL"
  | "CLOSED_SHELL"
  | "DEVELOPER";

export {
  BuildStandard,
  InsulationLevel,
  InvestmentState,
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
