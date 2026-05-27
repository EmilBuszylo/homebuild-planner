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

export async function fetchPlanResults(
  planId: string,
): Promise<PlanResultsDto | null> {
  const headerList = await headers();
  const cookie = headerList.get("cookie");

  const response = await fetch(
    `${getSiteOrigin()}/api/plans/${planId}/results`,
    {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<PlanResultsDto>;
}
