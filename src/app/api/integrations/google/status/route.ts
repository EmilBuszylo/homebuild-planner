import { NextResponse } from "next/server";

import { isGoogleCalendarConnected } from "@/lib/google-calendar/google-oauth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const connected = await isGoogleCalendarConnected(user.id);
  return NextResponse.json({ connected });
}
