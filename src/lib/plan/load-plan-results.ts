import { assemblePlanResultsDto } from "@/lib/plan/assemble-plan-results-dto";
import { loadStageNotesForPlan } from "@/lib/plan/load-plan-stage-notes";
import { planResultsSchema } from "@/lib/plan-results";
import type { PlanResultsDto } from "@/lib/plan-results";
import { prisma } from "@/lib/prisma";

export type LoadPlanResultsResult =
  | { status: "ok"; data: PlanResultsDto }
  | { status: "not_found" }
  | { status: "no_results" }
  | { status: "error" };

export async function loadPlanResults(
  planId: string,
  userId: string,
): Promise<LoadPlanResultsResult> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          stageResults: { orderBy: { sortOrder: "asc" } },
          responses: true,
        },
      },
    },
  });

  if (!plan || plan.userId !== userId) {
    return { status: "not_found" };
  }

  const version = plan.versions[0];
  if (!version || version.stageResults.length === 0) {
    return { status: "no_results" };
  }

  const slugs = version.stageResults.map((r) => r.stageSlug);
  const stageDefs = await prisma.constructionStage.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, category: true },
  });
  const stageDefsBySlug = new Map(stageDefs.map((s) => [s.slug, s]));

  const stageNotes = await loadStageNotesForPlan(plan.id, slugs);

  const payload = assemblePlanResultsDto({
    planId: plan.id,
    version,
    stageDefsBySlug,
    stageNotes,
  });

  const parsed = planResultsSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "error" };
  }

  return { status: "ok", data: parsed.data };
}
