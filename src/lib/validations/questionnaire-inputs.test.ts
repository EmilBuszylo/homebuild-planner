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

  it("rejects garage_spots when not a number", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      garage_spots: "1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects window_count above the maximum", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      window_count: 31,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid key_date format", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      key_date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects terrace_door_count below the minimum", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      terrace_door_count: -1,
    });
    expect(result.success).toBe(false);
  });

  it("requires utility_distance_band when municipal sewer or water is selected", () => {
    const withoutDistance = { ...validQuestionnairePayload };
    delete (withoutDistance as { utility_distance_band?: string })
      .utility_distance_band;

    const result = questionnaireInputsSchema.safeParse(withoutDistance);
    expect(result.success).toBe(false);
  });

  it("accepts missing utility_distance_band when neither service uses the municipal network", () => {
    const result = questionnaireInputsSchema.safeParse({
      ...validQuestionnairePayload,
      sewage_disposal: "SEPTIC_TANK",
      water_supply: "WELL",
      utility_distance_band: undefined,
    });
    expect(result.success).toBe(true);
  });
});
