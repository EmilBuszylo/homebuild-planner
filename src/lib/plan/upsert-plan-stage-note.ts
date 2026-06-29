import type { Prisma } from "@prisma/client";

import type { PlanStageNoteDto } from "@/lib/plan-results";
import {
  EmptyUnpinnedNoteError,
  InvalidStageSlugError,
} from "@/lib/plan/plan-stage-note-errors";

export type UpsertPlanStageNoteResult = {
  note: PlanStageNoteDto & { stageSlug: string };
};

export async function upsertPlanStageNote(
  tx: Prisma.TransactionClient,
  params: {
    planId: string;
    stageSlug: string;
    body: string;
    isPinned: boolean;
    activeSlugs: string[];
  },
): Promise<UpsertPlanStageNoteResult> {
  const { planId, stageSlug, body, isPinned, activeSlugs } = params;

  if (!activeSlugs.includes(stageSlug)) {
    throw new InvalidStageSlugError(stageSlug);
  }

  if (body === "" && !isPinned) {
    throw new EmptyUnpinnedNoteError();
  }

  const row = await tx.planStageNote.upsert({
    where: {
      planId_stageSlug: { planId, stageSlug },
    },
    create: {
      planId,
      stageSlug,
      body,
      isPinned,
    },
    update: {
      body,
      isPinned,
    },
  });

  return {
    note: {
      stageSlug: row.stageSlug,
      body: row.body,
      isPinned: row.isPinned,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}
