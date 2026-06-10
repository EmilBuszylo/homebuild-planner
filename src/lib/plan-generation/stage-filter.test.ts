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
