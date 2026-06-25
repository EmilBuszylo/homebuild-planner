import type { PlanStageNoteDto } from "@/lib/plan-results";
import { prisma } from "@/lib/prisma";

export async function loadStageNotesForPlan(
  planId: string,
  activeSlugs: string[],
): Promise<Record<string, PlanStageNoteDto>> {
  if (activeSlugs.length === 0) {
    return {};
  }

  const rows = await prisma.planStageNote.findMany({
    where: {
      planId,
      stageSlug: { in: activeSlugs },
    },
  });

  const notes: Record<string, PlanStageNoteDto> = {};
  for (const row of rows) {
    notes[row.stageSlug] = {
      body: row.body,
      isPinned: row.isPinned,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  return notes;
}
