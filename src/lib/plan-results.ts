export type PlanResultsStageDto = {
  stageSlug: string;
  name: string;
  category: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
};

export type PlanStageNoteDto = {
  body: string;
  isPinned: boolean;
  updatedAt: string;
};

export type PlanResultsDto = {
  planId: string;
  keyDate: string;
  /** Etykiety zakresu planu z odpowiedzi ankiety (start → cel). */
  planScopeLabel: string;
  totalCost: number;
  stages: PlanResultsStageDto[];
  stageNotes: Record<string, PlanStageNoteDto>;
  refinementApplied: boolean;
  benchmarkAsOf: string | null;
  benchmarkSource: string | null;
};
