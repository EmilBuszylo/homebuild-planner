import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

import {
  generatePlanResults,
  toQuestionnaireResponsesMap,
} from "./index";
import { minimalStagesForGeneration } from "./test-fixtures/minimal-stages";

function sumEstimatedCosts(
  results: { estimatedCost: number }[],
): number {
  return results.reduce((sum, row) => sum + row.estimatedCost, 0);
}

function responsesFromPayload(
  payload: QuestionnaireInputs,
) {
  return toQuestionnaireResponsesMap(payload);
}

describe("generatePlanResults", () => {
  it("returns non-empty positive-cost results for golden payload and minimal stages", () => {
    const responses = responsesFromPayload(validQuestionnairePayload);
    const results = generatePlanResults(
      minimalStagesForGeneration,
      responses,
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((row) => row.estimatedCost > 0)).toBe(true);
  });

  it("increases total estimated cost when area increases (same build standard)", () => {
    const base = {
      ...validQuestionnairePayload,
      build_standard: "STANDARD" as const,
      floors: 2,
    };
    const small = responsesFromPayload({ ...base, area: 80 });
    const large = responsesFromPayload({ ...base, area: 120 });

    const smallTotal = sumEstimatedCosts(
      generatePlanResults(minimalStagesForGeneration, small),
    );
    const largeTotal = sumEstimatedCosts(
      generatePlanResults(minimalStagesForGeneration, large),
    );

    expect(largeTotal).toBeGreaterThan(smallTotal);
  });

  it("increases total estimated cost for PREMIUM vs ECONOMY (same area)", () => {
    const area = 120;
    const economy = responsesFromPayload({
      ...validQuestionnairePayload,
      build_standard: "ECONOMY",
      area,
    });
    const premium = responsesFromPayload({
      ...validQuestionnairePayload,
      build_standard: "PREMIUM",
      area,
    });

    const economyTotal = sumEstimatedCosts(
      generatePlanResults(minimalStagesForGeneration, economy),
    );
    const premiumTotal = sumEstimatedCosts(
      generatePlanResults(minimalStagesForGeneration, premium),
    );

    expect(premiumTotal).toBeGreaterThan(economyTotal);
  });
});
