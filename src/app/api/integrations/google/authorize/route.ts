import { NextResponse } from "next/server";

import {
  getGoogleAuthorizeUrl,
} from "@/lib/google-calendar/google-oauth";
import { createOAuthState } from "@/lib/google-calendar/oauth-state";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { error: "Brak identyfikatora planu" },
      { status: 400 },
    );
  }

  try {
    const state = createOAuthState({
      userId: user.id,
      returnPlanId: planId,
    });
    const authorizeUrl = getGoogleAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("GET /api/integrations/google/authorize failed:", error);
    return NextResponse.json(
      { error: "Integracja Google Calendar nie jest skonfigurowana." },
      { status: 500 },
    );
  }
}
