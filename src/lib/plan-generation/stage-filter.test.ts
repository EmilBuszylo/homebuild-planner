import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";

import { filterStages } from "./stage-filter";
import { toQuestionnaireResponsesMap } from "./responses-map";
import { fullStagesForCalibration } from "./test-fixtures/full-stages-calibration";

describe("filterStages", () => {
  it("includes utility connection stages for golden DEVELOPER path", () => {
    const responses = toQuestionnaireResponsesMap(validQuestionnairePayload);
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).toContain("sewage_connection");
    expect(slugs).toContain("water_connection");
  });

  it("includes foundations and walls for FROM_SCRATCH → DEVELOPER (full plan)", () => {
    const responses = toQuestionnaireResponsesMap(validQuestionnairePayload);
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).toContain("foundations");
    expect(slugs).toContain("walls");
    expect(slugs).toContain("floor_slabs");
    expect(slugs).toContain("insulation");
  });

  it("excludes walls when target is FOUNDATIONS only (narrow scope)", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      investment_state: "FOUNDATIONS",
      starting_state: "FROM_SCRATCH",
    });
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).toContain("foundations");
    expect(slugs).not.toContain("walls");
  });

  it("excludes foundations when starting is OPEN_SHELL even for DEVELOPER target", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      starting_state: "OPEN_SHELL",
      investment_state: "DEVELOPER",
    });
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).not.toContain("foundations");
    expect(slugs).not.toContain("walls");
    expect(slugs).toContain("electrical");
  });

  it("excludes water_connection when water_supply is NONE", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      water_supply: "NONE",
    });
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).toContain("sewage_connection");
    expect(slugs).not.toContain("water_connection");
  });

  it("excludes garage_gate when garage_spots is zero (regression)", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      garage_spots: 0,
    });
    const slugs = filterStages(fullStagesForCalibration, responses).map(
      (stage) => stage.slug,
    );

    expect(slugs).not.toContain("garage_gate");
  });
});
