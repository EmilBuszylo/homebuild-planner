import { NextResponse } from "next/server";

import { loadStageNotesForPlan } from "@/lib/plan/load-plan-stage-notes";
import { reportError } from "@/lib/observability/report-error";
import type { PlanResultsDto } from "@/lib/plan-results";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { planId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
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

    if (!plan || plan.userId !== user.id) {
      return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });
    }

    const version = plan.versions[0];
    if (!version || version.stageResults.length === 0) {
      return NextResponse.json(
        { error: "Brak wyników dla tego planu" },
        { status: 404 },
      );
    }

    const slugs = version.stageResults.map((r) => r.stageSlug);
    const stageDefs = await prisma.constructionStage.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, name: true, category: true },
    });
    const stageBySlug = new Map(stageDefs.map((s) => [s.slug, s]));

    const keyDate =
      version.responses.find((r) => r.questionSlug === "key_date")?.value ?? "";

    const stages = version.stageResults.map((result) => {
      const def = stageBySlug.get(result.stageSlug);
      return {
        stageSlug: result.stageSlug,
        name: def?.name ?? result.stageSlug,
        category: def?.category ?? "",
        estimatedCost: result.estimatedCost,
        startDay: result.startDay,
        durationDays: result.durationDays,
      };
    });

    const totalCost = stages.reduce((sum, s) => sum + s.estimatedCost, 0);
    const stageNotes = await loadStageNotesForPlan(plan.id, slugs);

    const payload: PlanResultsDto = {
      planId: plan.id,
      keyDate,
      totalCost,
      stages,
      stageNotes,
      refinementApplied: version.refinementApplied,
      benchmarkAsOf: version.benchmarkFetchedAt?.toISOString() ?? null,
      benchmarkSource: version.benchmarkSourceName,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error(`GET /api/plans/${planId}/results failed:`, error);
    reportError(error, { route: `GET /api/plans/${planId}/results` });
    return NextResponse.json(
      { error: "Nie udało się wczytać wyników planu. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
