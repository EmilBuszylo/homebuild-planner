import { NextResponse } from "next/server";

import { persistPlanVersionWithResults } from "@/lib/plan/persist-plan-version";
import { prisma } from "@/lib/prisma";
import { checkPlanRecalcLimit } from "@/lib/rate-limit/plan-recalc";
import { createClient } from "@/lib/supabase/server";
import { questionnaireInputsSchema } from "@/lib/validations/questionnaire";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;

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

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true },
  });

  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const rateLimit = await checkPlanRecalcLimit(tx, { userId: user.id });
      if (!rateLimit.allowed) {
        const payload = {
          error:
            "Zbyt wiele przeliczeń w krótkim czasie. Spróbuj ponownie później.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          limit: rateLimit.limit,
          windowHours: rateLimit.windowHours,
        };

        throw Object.assign(new Error("RATE_LIMIT"), {
          name: "RateLimitError",
          payload,
        });
      }

      const latest = await tx.planVersion.findFirst({
        where: { planId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

      await persistPlanVersionWithResults(tx, {
        planId,
        versionNumber: nextVersionNumber,
        inputs: parsed.data,
      });

      await tx.plan.update({
        where: { id: planId },
        data: { updatedAt: new Date() },
      });
    });

    return NextResponse.json({ planId }, { status: 200 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: unknown }).name === "RateLimitError" &&
      "payload" in error
    ) {
      return NextResponse.json((error as { payload: unknown }).payload, {
        status: 429,
      });
    }

    return NextResponse.json(
      { error: "Nie udało się przeliczyć planu. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
