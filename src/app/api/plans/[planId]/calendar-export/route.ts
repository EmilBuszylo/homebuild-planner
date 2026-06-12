import { NextResponse } from "next/server";

import {
  exportStagesToGoogleCalendar,
  GoogleCalendarNotConnectedError,
  InvalidCalendarStageSlugError,
} from "@/lib/google-calendar/export-stages-to-calendar";
import { reportError } from "@/lib/observability/report-error";
import { createClient } from "@/lib/supabase/server";
import { calendarExportSchema } from "@/lib/validations/calendar-export";

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

  const body = await request.json().catch(() => ({}));
  const parsed = calendarExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane eksportu", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await exportStagesToGoogleCalendar({
      userId: user.id,
      planId,
      stageSlugs: parsed.data.stageSlugs,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidCalendarStageSlugError) {
      return NextResponse.json(
        { error: "Nieprawidłowy etap dla tego planu" },
        { status: 400 },
      );
    }

    if (error instanceof GoogleCalendarNotConnectedError) {
      return NextResponse.json(
        { error: "Połącz konto Google Calendar przed eksportem." },
        { status: 412 },
      );
    }

    if (error instanceof Error && error.message === "Plan not found") {
      return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });
    }

    console.error(`POST /api/plans/${planId}/calendar-export failed:`, error);
    reportError(error, {
      route: `POST /api/plans/${planId}/calendar-export`,
    });
    return NextResponse.json(
      { error: "Nie udało się wyeksportować etapów do kalendarza." },
      { status: 500 },
    );
  }
}
