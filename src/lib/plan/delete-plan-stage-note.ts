import type { Prisma } from "@prisma/client";

import { InvalidStageSlugError } from "@/lib/plan/plan-stage-note-errors";

export async function deletePlanStageNote(
  tx: Prisma.TransactionClient,
  params: {
    planId: string;
    stageSlug: string;
    activeSlugs: string[];
  },
): Promise<{ deleted: true }> {
  const { planId, stageSlug, activeSlugs } = params;

  if (!activeSlugs.includes(stageSlug)) {
    throw new InvalidStageSlugError(stageSlug);
  }

  await tx.planStageNote.deleteMany({
    where: { planId, stageSlug },
  });

  return { deleted: true };
}
