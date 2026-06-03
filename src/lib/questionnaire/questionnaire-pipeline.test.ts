import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import {
  generatePlanResults,
  toQuestionnaireResponsesMap,
} from "@/lib/plan-generation";
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
});
