import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import type { StageCostModifier } from "@/lib/types/domain";

import { computeStageCost, isModifierActive } from "./compute-costs";
import { toQuestionnaireResponsesMap } from "./responses-map";
import { fullStagesForCalibration } from "./test-fixtures/full-stages-calibration";

function utilityStage(slug: "sewage_connection" | "water_connection") {
  const stage = fullStagesForCalibration.find((row) => row.slug === slug);
  if (!stage) {
    throw new Error(`missing fixture stage: ${slug}`);
  }
  return stage;
}

function distanceModifier(stageSlug: string, band: string): StageCostModifier {
  const stage = fullStagesForCalibration.find((row) => row.slug === stageSlug);
  const modifier = stage?.costModifiers.find(
    (row) =>
      row.triggerQuestionSlug === "utility_distance_band" &&
      row.triggerValue === band,
  );
  if (!modifier) {
    throw new Error(`missing distance modifier: ${stageSlug} / ${band}`);
  }
  return modifier;
}

describe("isModifierActive", () => {
  it("ignores distance-band modifiers on sewage when disposal is not MUNICIPAL", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      sewage_disposal: "SEPTIC_TANK",
      utility_distance_band: "UP_TO_100M",
    });
    const modifier = distanceModifier("sewage_connection", "UP_TO_100M");

    expect(
      isModifierActive(modifier, "sewage_connection", responses),
    ).toBe(false);
  });

  it("applies distance-band modifiers on sewage when disposal is MUNICIPAL", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      sewage_disposal: "MUNICIPAL",
      utility_distance_band: "UP_TO_100M",
    });
    const modifier = distanceModifier("sewage_connection", "UP_TO_100M");

    expect(isModifierActive(modifier, "sewage_connection", responses)).toBe(
      true,
    );
  });
});

describe("computeStageCost — utility connections", () => {
  it("charges flat MUNICIPAL sewage without distance add-on at UP_TO_50M", () => {
    const responses = toQuestionnaireResponsesMap(validQuestionnairePayload);
    const cost = computeStageCost(utilityStage("sewage_connection"), responses);

    expect(cost).toBe(12_000);
  });

  it("adds distance add-on for MUNICIPAL sewage at UP_TO_100M", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      utility_distance_band: "UP_TO_100M",
    });
    const cost = computeStageCost(utilityStage("sewage_connection"), responses);

    expect(cost).toBe(16_000);
  });

  it("does not add distance add-on for SEPTIC_TANK even when band is UP_TO_100M", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      sewage_disposal: "SEPTIC_TANK",
      utility_distance_band: "UP_TO_100M",
    });
    const cost = computeStageCost(utilityStage("sewage_connection"), responses);

    expect(cost).toBe(7_500);
  });

  it("charges flat MUNICIPAL water without distance add-on at UP_TO_50M", () => {
    const responses = toQuestionnaireResponsesMap(validQuestionnairePayload);
    const cost = computeStageCost(utilityStage("water_connection"), responses);

    expect(cost).toBe(8_000);
  });
});

describe("computeStageCost — roof type modifiers (S-02)", () => {
  function roofStage(slug: "roof_structure" | "roof_covering") {
    const stage = fullStagesForCalibration.find((row) => row.slug === slug);
    if (!stage) {
      throw new Error(`missing fixture stage: ${slug}`);
    }
    return stage;
  }

  it("stacks HIP and ENHANCED insulation on roof_structure from the same base", () => {
    const responses = toQuestionnaireResponsesMap({
      ...validQuestionnairePayload,
      roof_type: "HIP",
      insulation_level: "ENHANCED",
    });
    const cost = computeStageCost(roofStage("roof_structure"), responses);

    expect(cost).toBe(53_760);
  });
});
