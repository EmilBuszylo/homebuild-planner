import { headers } from "next/headers";

import type { PlanResultsDto } from "@/lib/plan-results";

function getSiteOrigin(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export type FetchPlanResultsResult =
  | { status: "ok"; data: PlanResultsDto }
  | { status: "not_found" }
  | { status: "unauthorized" }
  | { status: "error" };

export async function fetchPlanResults(
  planId: string,
): Promise<FetchPlanResultsResult> {
  const headerList = await headers();
  const cookie = headerList.get("cookie");

  const response = await fetch(
    `${getSiteOrigin()}/api/plans/${planId}/results`,
    {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    return { status: "unauthorized" };
  }

  if (response.status === 404) {
    return { status: "not_found" };
  }

  if (!response.ok) {
    return { status: "error" };
  }

  const data = (await response.json()) as PlanResultsDto;
  return { status: "ok", data };
}
