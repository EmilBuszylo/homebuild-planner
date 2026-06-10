import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import {
  generatePlanResults,
  toQuestionnaireResponsesMap,
} from "@/lib/plan-generation";
import {
  CALIBRATED_GOLDEN_TOTAL_MAX,
  CALIBRATED_GOLDEN_TOTAL_MIN,
} from "@/lib/plan-generation/test-fixtures/calibrated-golden-expectations";
import { fullStagesForCalibration } from "@/lib/plan-generation/test-fixtures/full-stages-calibration";
import { minimalStagesForGeneration } from "@/lib/plan-generation/test-fixtures/minimal-stages";
import { questionnaireInputsSchema } from "@/lib/validations/questionnaire";

/**
 * Cross Risk #4 (test-plan §2): valid questionnaire inputs must feed non-empty
 * generation. Complements Phase 2 handler POST tests — not a substitute.
 */
describe("questionnaire → generation pipeline", () => {
  it("produces non-empty positive-cost stage results from golden questionnaire payload", () => {
    const parsed = questionnaireInputsSchema.safeParse(validQuestionnairePayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const responsesMap = toQuestionnaireResponsesMap(parsed.data);
    const results = generatePlanResults(
      minimalStagesForGeneration,
      responsesMap,
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((row) => row.estimatedCost > 0)).toBe(true);
  });

  it("full calibration fixture total stays within golden workbook band", () => {
    const parsed = questionnaireInputsSchema.safeParse(validQuestionnairePayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    const responsesMap = toQuestionnaireResponsesMap(parsed.data);
    const results = generatePlanResults(
      fullStagesForCalibration,
      responsesMap,
    );
    const total = results.reduce((sum, row) => sum + row.estimatedCost, 0);

    expect(total).toBeGreaterThanOrEqual(CALIBRATED_GOLDEN_TOTAL_MIN);
    expect(total).toBeLessThanOrEqual(CALIBRATED_GOLDEN_TOTAL_MAX);
  });
});
