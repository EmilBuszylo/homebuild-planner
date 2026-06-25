import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/site-origin", () => ({
  getSiteOrigin: () => "http://localhost:3000",
}));

import { fetchPlanResults } from "./fetch-plan-results";

const validPayload = {
  planId: "plan-1",
  keyDate: "2026-09-01",
  planScopeLabel: "Od zera → stan deweloperski",
  totalCost: 100_000,
  stages: [
    {
      stageSlug: "foundations",
      name: "Fundamenty",
      category: "Budowa",
      estimatedCost: 100_000,
      startDay: 0,
      durationDays: 30,
    },
  ],
  stageNotes: {},
  refinementApplied: false,
  benchmarkAsOf: null,
  benchmarkSource: null,
};

describe("fetchPlanResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue({
      get: (name: string) => (name === "cookie" ? "session=abc" : null),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        ok: true,
        json: async () => validPayload,
      })),
    );
  });

  it("returns unauthorized on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 401,
        ok: false,
        json: async () => ({}),
      })),
    );

    const result = await fetchPlanResults("plan-1");

    expect(result).toEqual({ status: "unauthorized" });
  });

  it("returns not_found on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 404,
        ok: false,
        json: async () => ({ error: "Brak wyników dla tego planu" }),
      })),
    );

    const result = await fetchPlanResults("plan-1");

    expect(result).toEqual({ status: "not_found" });
  });

  it("returns error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 500,
        ok: false,
        json: async () => ({}),
      })),
    );

    const result = await fetchPlanResults("plan-1");

    expect(result).toEqual({ status: "error" });
  });

  it("returns error when JSON fails Zod contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        ok: true,
        json: async () => ({ planId: "plan-1" }),
      })),
    );

    const result = await fetchPlanResults("plan-1");

    expect(result).toEqual({ status: "error" });
  });

  it("returns ok with parsed data on valid 200", async () => {
    const result = await fetchPlanResults("plan-1");

    expect(result).toEqual({ status: "ok", data: validPayload });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/plans/plan-1/results",
      expect.objectContaining({
        headers: { cookie: "session=abc" },
        cache: "no-store",
      }),
    );
  });
});
