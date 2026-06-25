import type { Prisma } from "@prisma/client";

import type { PlanStageNoteDto } from "@/lib/plan-results";

export class InvalidStageSlugError extends Error {
  constructor(stageSlug: string) {
    super(`Invalid stage slug: ${stageSlug}`);
    this.name = "InvalidStageSlugError";
  }
}

export type UpsertPlanStageNoteResult =
  | { deleted: true }
  | { deleted: false; note: PlanStageNoteDto & { stageSlug: string } };

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
    await tx.planStageNote.deleteMany({
      where: { planId, stageSlug },
    });
    return { deleted: true };
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
    deleted: false,
    note: {
      stageSlug: row.stageSlug,
      body: row.body,
      isPinned: row.isPinned,
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}
