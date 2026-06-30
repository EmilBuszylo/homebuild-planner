/**
 * Engine unit tests — test-plan.md §2 Risk #3 (benchmark / cost oracle).
 * Directional asserts use requirement-derived relationships; golden asserts use
 * calibration workbook constants (not production formula replay).
 *
 * Integration complement: plans-route-handlers.test.ts (Risk #4, #5).
 */

import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

import {
  generatePlanResults,
  toQuestionnaireResponsesMap,
} from "./index";
import {
  CALIBRATED_GOLDEN_EXPECTATIONS,
  CALIBRATED_GOLDEN_TOTAL,
  ROOF_FLAT_GOLDEN_TOTAL,
  ROOF_HIP_GOLDEN_TOTAL,
  ROOF_MANSARD_GOLDEN_TOTAL,
} from "./test-fixtures/calibrated-golden-expectations";
import { fullStagesForCalibration } from "./test-fixtures/full-stages-calibration";
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
  describe("benchmark and engine oracle (Risk #3)", () => {
    it("returns non-empty positive-cost results for golden payload and minimal stages", () => {
      const responses = responsesFromPayload(validQuestionnairePayload);
      const results = generatePlanResults(
        minimalStagesForGeneration,
        responses,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((row) => row.estimatedCost > 0)).toBe(true);
    });

    describe("directional oracle (minimal fixture)", () => {
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

    describe("S-01 calibration golden oracle (DEVELOPER path)", () => {
      it("matches per-stage costs from calibration workbook", () => {
        const responses = responsesFromPayload(validQuestionnairePayload);
        const results = generatePlanResults(
          fullStagesForCalibration,
          responses,
        );

        expect(results).toHaveLength(
          Object.keys(CALIBRATED_GOLDEN_EXPECTATIONS).length,
        );

        for (const [slug, expectedCost] of Object.entries(
          CALIBRATED_GOLDEN_EXPECTATIONS,
        )) {
          const row = results.find((r) => r.stageSlug === slug);
          expect(row, `missing stage ${slug}`).toBeDefined();
          expect(row?.estimatedCost).toBe(expectedCost);
        }
      });

      it("sums to calibrated golden total", () => {
        const responses = responsesFromPayload(validQuestionnairePayload);
        const total = sumEstimatedCosts(
          generatePlanResults(fullStagesForCalibration, responses),
        );

        expect(total).toBe(CALIBRATED_GOLDEN_TOTAL);
      });
    });

    describe("S-02 roof type golden oracle (DEVELOPER path)", () => {
      it.each([
        ["HIP", ROOF_HIP_GOLDEN_TOTAL, { roof_structure: 48_000, roof_covering: 34_500 }],
        [
          "MANSARD",
          ROOF_MANSARD_GOLDEN_TOTAL,
          { roof_structure: 69_120, roof_covering: 36_000 },
        ],
        [
          "FLAT",
          ROOF_FLAT_GOLDEN_TOTAL,
          { roof_structure: 26_880, roof_covering: 31_500 },
        ],
      ] as const)(
        "sums to %s total and roof stage costs",
        (roofType, expectedTotal, roofCosts) => {
          const responses = responsesFromPayload({
            ...validQuestionnairePayload,
            roof_type: roofType,
          });
          const results = generatePlanResults(
            fullStagesForCalibration,
            responses,
          );
          const total = sumEstimatedCosts(results);

          expect(total).toBe(expectedTotal);
          for (const [slug, expectedCost] of Object.entries(roofCosts)) {
            const row = results.find((r) => r.stageSlug === slug);
            expect(row?.estimatedCost).toBe(expectedCost);
          }
        },
      );
    });
  });
});
