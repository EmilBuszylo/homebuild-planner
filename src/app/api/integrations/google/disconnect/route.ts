import { NextResponse } from "next/server";

import { disconnectGoogleCalendar } from "@/lib/google-calendar/google-oauth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  await disconnectGoogleCalendar(user.id);
  return NextResponse.json({ disconnected: true });
}
