import { NextResponse } from "next/server";

import { reportError } from "@/lib/observability/report-error";
import { persistPlanVersionWithResults } from "@/lib/plan/persist-plan-version";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { questionnaireInputsSchema } from "@/lib/validations/questionnaire";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = questionnaireInputsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane ankiety", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email ?? "" },
        update: {},
      });

      const existingPlan = await tx.plan.findFirst({
        where: { userId: user.id },
      });

      if (existingPlan) {
        return { plan: existingPlan, created: false } as const;
      }

      const newPlan = await tx.plan.create({
        data: { userId: user.id },
      });

      await persistPlanVersionWithResults(tx, {
        planId: newPlan.id,
        versionNumber: 1,
        inputs: parsed.data,
      });

      return { plan: newPlan, created: true } as const;
    });

    if (!result.created) {
      return NextResponse.json(
        { error: "Plan już istnieje", planId: result.plan.id },
        { status: 409 },
      );
    }

    return NextResponse.json({ planId: result.plan.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/plans failed:", error);
    reportError(error, { route: "POST /api/plans" });
    return NextResponse.json(
      { error: "Nie udało się zapisać planu. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
