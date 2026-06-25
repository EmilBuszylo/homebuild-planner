import { prisma } from "@/lib/prisma";

/** Stage slugs from the latest plan version, or null when the plan has no results yet. */
export async function getActiveStageSlugsForPlan(
  planId: string,
): Promise<string[] | null> {
  const version = await prisma.planVersion.findFirst({
    where: { planId },
    orderBy: { versionNumber: "desc" },
    select: {
      stageResults: {
        select: { stageSlug: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!version || version.stageResults.length === 0) {
    return null;
  }

  return version.stageResults.map((row) => row.stageSlug);
}
