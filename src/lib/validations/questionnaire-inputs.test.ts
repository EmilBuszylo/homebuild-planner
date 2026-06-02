import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import { STATE_ORDER_ERROR_MESSAGE } from "@/lib/investment-state";
import { questionnaireInputsSchema } from "@/lib/validations/questionnaire";

describe("questionnaireInputsSchema", () => {
  it("accepts a valid golden payload", () => {
    const result = questionnaireInputsSchema.safeParse(validQuestionnairePayload);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid investment_state enum", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      investment_state: "FROM_SCRATCH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects area below the minimum (50 m²)", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      area: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when starting_state is not before investment_state", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      starting_state: "CLOSED_SHELL",
      investment_state: "FOUNDATIONS",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const startingIssue = result.error.issues.find(
        (issue) => issue.path[0] === "starting_state",
      );
      expect(startingIssue?.message).toBe(STATE_ORDER_ERROR_MESSAGE);
    }
  });

  it("rejects a missing key_date", () => {
    const withoutKeyDate = { ...validQuestionnairePayload };
    delete (withoutKeyDate as { key_date?: string }).key_date;
    const result = questionnaireInputsSchema.safeParse(withoutKeyDate);
    expect(result.success).toBe(false);
  });

  it("rejects floors when not a number", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      floors: "2",
    });
    expect(result.success).toBe(false);
  });
});
