import { headers } from "next/headers";

import { planResultsSchema } from "@/lib/plan-results";
import type { PlanResultsDto } from "@/lib/plan-results";
import { getSiteOrigin } from "@/lib/site-origin";

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

  const json: unknown = await response.json();
  const parsed = planResultsSchema.safeParse(json);
  if (!parsed.success) {
    return { status: "error" };
  }

  return { status: "ok", data: parsed.data };
}
