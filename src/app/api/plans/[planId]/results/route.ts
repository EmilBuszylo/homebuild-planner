import { NextResponse } from "next/server";

import { loadPlanResults } from "@/lib/plan/load-plan-results";
import { reportError } from "@/lib/observability/report-error";
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
    const result = await loadPlanResults(planId, user.id);

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });
    }

    if (result.status === "no_results") {
      return NextResponse.json(
        { error: "Brak wyników dla tego planu" },
        { status: 404 },
      );
    }

    if (result.status === "error") {
      return NextResponse.json(
        { error: "Nie udało się wczytać wyników planu. Spróbuj ponownie." },
        { status: 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error(`GET /api/plans/${planId}/results failed:`, error);
    reportError(error, { route: `GET /api/plans/${planId}/results` });
    return NextResponse.json(
      { error: "Nie udało się wczytać wyników planu. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
