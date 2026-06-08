import { describe, expect, it } from "vitest";

import type { PlanStageResultInput, StageWithModifiers } from "@/lib/plan-generation";

import { applyMarketBenchmarks } from "./apply-market-benchmarks";

const fetchedAt = new Date("2026-01-15T12:00:00Z");

function makeFixture(estimatedCost: number) {
  const localResults: PlanStageResultInput[] = [
    {
      stageSlug: "foundations",
      estimatedCost,
      startDay: 0,
      durationDays: 10,
      sortOrder: 0,
    },
  ];

  const stages = [
    {
      slug: "foundations",
      category: "STRUCTURE",
      costModifiers: [],
    },
  ] as unknown as StageWithModifiers[];

  return { localResults, stages };
}

describe("applyMarketBenchmarks", () => {
  it("returns pass-through when benchmarks array is empty", () => {
    const { localResults, stages } = makeFixture(1000);

    const outcome = applyMarketBenchmarks(localResults, stages, []);

    expect(outcome.results).toEqual(localResults);
    expect(outcome.refinementApplied).toBe(false);
    expect(outcome.benchmarkFetchedAt).toBeNull();
    expect(outcome.benchmarkSourceName).toBeNull();
  });

  it("applies in-range multiplier and sets refinement metadata", () => {
    const { localResults, stages } = makeFixture(1000);

    const outcome = applyMarketBenchmarks(localResults, stages, [
      {
        stageCategory: "STRUCTURE",
        multiplier: 1.1,
        sourceName: "test-source",
        fetchedAt,
      },
    ]);

    expect(outcome.results[0]?.estimatedCost).toBe(1100);
    expect(outcome.refinementApplied).toBe(true);
    expect(outcome.benchmarkFetchedAt).toEqual(fetchedAt);
    expect(outcome.benchmarkSourceName).toBe("test-source");
  });

  it("clamps multipliers below minimum and above maximum", () => {
    const { localResults, stages } = makeFixture(1000);

    const low = applyMarketBenchmarks(localResults, stages, [
      {
        stageCategory: "STRUCTURE",
        multiplier: 0.5,
        sourceName: "low",
        fetchedAt,
      },
    ]);
    expect(low.results[0]?.estimatedCost).toBe(850);

    const high = applyMarketBenchmarks(localResults, stages, [
      {
        stageCategory: "STRUCTURE",
        multiplier: 2,
        sourceName: "high",
        fetchedAt,
      },
    ]);
    expect(high.results[0]?.estimatedCost).toBe(1250);
  });

  it("sets refinementApplied false when estimated cost does not change", () => {
    const { localResults, stages } = makeFixture(1000);

    const unitMultiplier = applyMarketBenchmarks(localResults, stages, [
      {
        stageCategory: "STRUCTURE",
        multiplier: 1,
        sourceName: "unit",
        fetchedAt,
      },
    ]);
    expect(unitMultiplier.refinementApplied).toBe(false);

    const unmatchedCategory = applyMarketBenchmarks(localResults, stages, [
      {
        stageCategory: "FINISHING",
        multiplier: 1.2,
        sourceName: "other",
        fetchedAt,
      },
    ]);
    expect(unmatchedCategory.results[0]?.estimatedCost).toBe(1000);
    expect(unmatchedCategory.refinementApplied).toBe(false);
  });
});
