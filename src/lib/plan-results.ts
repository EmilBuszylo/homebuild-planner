export type PlanResultsStageDto = {
  stageSlug: string;
  name: string;
  category: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
};

export type PlanResultsDto = {
  planId: string;
  keyDate: string;
  totalCost: number;
  stages: PlanResultsStageDto[];
};
