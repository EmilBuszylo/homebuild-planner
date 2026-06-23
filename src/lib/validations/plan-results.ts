import { z } from "zod";

export const planResultsStageSchema = z.object({
  stageSlug: z.string(),
  name: z.string(),
  category: z.string(),
  estimatedCost: z.number(),
  startDay: z.number(),
  durationDays: z.number(),
});

export const planStageNoteSchema = z.object({
  body: z.string(),
  isPinned: z.boolean(),
  updatedAt: z.string(),
});

export const planResultsSchema = z.object({
  planId: z.string(),
  keyDate: z.string(),
  planScopeLabel: z.string(),
  totalCost: z.number(),
  stages: z.array(planResultsStageSchema),
  stageNotes: z.record(z.string(), planStageNoteSchema),
  refinementApplied: z.boolean(),
  benchmarkAsOf: z.string().nullable(),
  benchmarkSource: z.string().nullable(),
});

export type PlanResultsStageDto = z.infer<typeof planResultsStageSchema>;
export type PlanStageNoteDto = z.infer<typeof planStageNoteSchema>;
export type PlanResultsDto = z.infer<typeof planResultsSchema>;
