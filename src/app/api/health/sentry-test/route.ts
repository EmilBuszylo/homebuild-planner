import { NextResponse } from "next/server";

import { reportError } from "@/lib/observability/report-error";

export const runtime = "nodejs";

function isTestRouteEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.SENTRY_ENABLE_TEST_ROUTE === "true"
  );
}

export async function GET() {
  if (!isTestRouteEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const error = new Error("Sentry smoke test");
  console.error("GET /api/health/sentry-test:", error);
  reportError(error, { route: "GET /api/health/sentry-test" });
  return NextResponse.json(
    { ok: false, message: "Sentry smoke test triggered" },
    { status: 500 },
  );
}
