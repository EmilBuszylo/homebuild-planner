import { describe, expect, it } from "vitest";

import { sortPlanStagesChronologically } from "@/lib/plan/sort-plan-stages-chronologically";
import type { PlanResultsStageDto } from "@/lib/plan-results";

function stage(overrides: Partial<PlanResultsStageDto> = {}): PlanResultsStageDto {
  return {
    stageSlug: overrides.stageSlug ?? "stage",
    name: overrides.name ?? "Etap",
    category: overrides.category ?? "category",
    estimatedCost: overrides.estimatedCost ?? 1000,
    startDay: overrides.startDay ?? 0,
    durationDays: overrides.durationDays ?? 1,
  };
}

describe("sortPlanStagesChronologically", () => {
  it("sorts by startDay asc", () => {
    const input = [
      stage({ stageSlug: "b", startDay: 5 }),
      stage({ stageSlug: "a", startDay: 0 }),
      stage({ stageSlug: "c", startDay: 2 }),
    ];

    expect(sortPlanStagesChronologically(input).map((s) => s.stageSlug)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("is stable for the same startDay", () => {
    const input = [
      stage({ stageSlug: "first", startDay: 3 }),
      stage({ stageSlug: "second", startDay: 3 }),
      stage({ stageSlug: "third", startDay: 3 }),
    ];

    expect(sortPlanStagesChronologically(input).map((s) => s.stageSlug)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

