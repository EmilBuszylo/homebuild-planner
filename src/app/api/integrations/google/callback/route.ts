import { NextResponse } from "next/server";

import {
  createGoogleOAuth2Client,
  upsertGoogleCalendarCredential,
} from "@/lib/google-calendar/google-oauth";
import { verifyOAuthState } from "@/lib/google-calendar/oauth-state";
import { routes } from "@/lib/routes";
import { getSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${getSiteOrigin()}${routes.dashboard}?googleCalendar=denied`,
    );
  }

  if (!code || !stateParam) {
    return NextResponse.json(
      { error: "Brak kodu autoryzacji Google" },
      { status: 400 },
    );
  }

  const state = verifyOAuthState(stateParam);
  if (!state) {
    return NextResponse.json(
      { error: "Nieprawidłowy lub wygasły stan OAuth" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state.userId) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const client = createGoogleOAuth2Client();
    const { tokens } = await client.getToken(code);
    await upsertGoogleCalendarCredential(user.id, tokens);

    const redirectUrl = new URL(
      routes.plan(state.returnPlanId),
      getSiteOrigin(),
    );
    redirectUrl.searchParams.set("googleCalendar", "connected");
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("GET /api/integrations/google/callback failed:", error);
    return NextResponse.json(
      { error: "Nie udało się połączyć z Google Calendar." },
      { status: 500 },
    );
  }
}
