import { NextResponse } from "next/server";

import { getActiveStageSlugsForPlan } from "@/lib/plan/get-active-stage-slugs";
import {
  InvalidStageSlugError,
  upsertPlanStageNote,
} from "@/lib/plan/upsert-plan-stage-note";
import { reportError } from "@/lib/observability/report-error";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertPlanStageNoteSchema } from "@/lib/validations/plan-stage-note";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertPlanStageNoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane notatki", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true },
  });

  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });
  }

  const activeSlugs = await getActiveStageSlugsForPlan(planId);
  if (!activeSlugs) {
    return NextResponse.json(
      { error: "Brak wyników dla tego planu" },
      { status: 404 },
    );
  }

  try {
    const result = await prisma.$transaction((tx) =>
      upsertPlanStageNote(tx, {
        planId,
        stageSlug: parsed.data.stageSlug,
        body: parsed.data.body,
        isPinned: parsed.data.isPinned,
        activeSlugs,
      }),
    );

    if (result.deleted) {
      return NextResponse.json({ deleted: true, stageSlug: parsed.data.stageSlug });
    }

    return NextResponse.json(result.note);
  } catch (error) {
    if (error instanceof InvalidStageSlugError) {
      return NextResponse.json(
        { error: "Nieprawidłowy etap dla tego planu" },
        { status: 400 },
      );
    }

    console.error(`PUT /api/plans/${planId}/stage-notes failed:`, error);
    reportError(error, { route: `PUT /api/plans/${planId}/stage-notes` });
    return NextResponse.json(
      { error: "Nie udało się zapisać notatki. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
