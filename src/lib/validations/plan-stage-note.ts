import { z } from "zod";

export const upsertPlanStageNoteSchema = z.object({
  stageSlug: z.string().min(1, "Identyfikator etapu jest wymagany"),
  body: z
    .string()
    .max(2000, "Notatka może mieć maksymalnie 2000 znaków")
    .default(""),
  isPinned: z.boolean(),
});

export type UpsertPlanStageNoteInput = z.infer<typeof upsertPlanStageNoteSchema>;

export const deletePlanStageNoteQuerySchema = z.object({
  stageSlug: z.string().min(1, "Identyfikator etapu jest wymagany"),
});

export type DeletePlanStageNoteQuery = z.infer<
  typeof deletePlanStageNoteQuerySchema
>;
