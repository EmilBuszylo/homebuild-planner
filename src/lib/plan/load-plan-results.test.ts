import { beforeEach, describe, expect, it, vi } from "vitest";

const planFindUnique = vi.hoisted(() => vi.fn());
const constructionStageFindMany = vi.hoisted(() => vi.fn());
const loadStageNotesForPlan = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    plan: { findUnique: planFindUnique },
    constructionStage: { findMany: constructionStageFindMany },
  },
}));

vi.mock("@/lib/plan/load-plan-stage-notes", () => ({
  loadStageNotesForPlan,
}));

import { loadPlanResults } from "./load-plan-results";

const USER_A = "user-a";
const PLAN_ID = "plan-1";

const validStageResult = {
  stageSlug: "foundations",
  estimatedCost: 100_000,
  startDay: 0,
  durationDays: 30,
  sortOrder: 0,
};

const validVersion = {
  refinementApplied: false,
  benchmarkFetchedAt: null,
  benchmarkSourceName: null,
  stageResults: [validStageResult],
  responses: [
    { questionSlug: "key_date", value: "2026-09-01" },
    { questionSlug: "starting_state", value: "greenfield" },
    { questionSlug: "investment_state", value: "developer_state" },
  ],
};

describe("loadPlanResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadStageNotesForPlan.mockResolvedValue({});
    constructionStageFindMany.mockResolvedValue([
      { slug: "foundations", name: "Fundamenty", category: "Budowa" },
    ]);
  });

  it("returns not_found when plan does not exist", async () => {
    planFindUnique.mockResolvedValue(null);

    const result = await loadPlanResults(PLAN_ID, USER_A);

    expect(result).toEqual({ status: "not_found" });
  });

  it("returns not_found when plan belongs to another user", async () => {
    planFindUnique.mockResolvedValue({
      id: PLAN_ID,
      userId: "user-b",
      versions: [validVersion],
    });

    const result = await loadPlanResults(PLAN_ID, USER_A);

    expect(result).toEqual({ status: "not_found" });
  });

  it("returns no_results when plan has no stage results", async () => {
    planFindUnique.mockResolvedValue({
      id: PLAN_ID,
      userId: USER_A,
      versions: [{ ...validVersion, stageResults: [] }],
    });

    const result = await loadPlanResults(PLAN_ID, USER_A);

    expect(result).toEqual({ status: "no_results" });
  });

  it("returns ok with parsed DTO for a valid owned plan", async () => {
    planFindUnique.mockResolvedValue({
      id: PLAN_ID,
      userId: USER_A,
      versions: [validVersion],
    });

    const result = await loadPlanResults(PLAN_ID, USER_A);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.planId).toBe(PLAN_ID);
      expect(result.data.stages).toHaveLength(1);
      expect(result.data.totalCost).toBe(100_000);
    }
  });
});
