import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { calibrationModifierDefs } from "./test-fixtures/calibration-modifier-defs";
import { calibrationStageRateDefs } from "./test-fixtures/full-stages-calibration";
import {
  parseSeedModifierList,
  parseSeedStageRates,
} from "./test-fixtures/parse-seed-calibration";

/**
 * Guards S-01 calibration drift between `prisma/seed.ts` and Vitest fixtures.
 * Does not import the seed module (Prisma runtime) — parses seed source instead.
 */
describe("calibration seed ↔ fixture parity", () => {
  it("matches stage PLN/m² tiers for all 20 slugs", () => {
    const seedRates = parseSeedStageRates();
    expect(seedRates.size).toBe(20);
    expect(calibrationStageRateDefs).toHaveLength(20);

    for (const fixture of calibrationStageRateDefs) {
      const seed = seedRates.get(fixture.slug);
      expect(seed, `missing seed rates for ${fixture.slug}`).toBeDefined();
      expect(seed).toEqual({
        costPerM2Economy: fixture.costPerM2Economy,
        costPerM2Standard: fixture.costPerM2Standard,
        costPerM2Premium: fixture.costPerM2Premium,
      });
    }
  });

  it("matches modifier rows for all calibration fixture defs", () => {
    const seedModifiers = parseSeedModifierList();
    expect(seedModifiers.length).toBe(calibrationModifierDefs.length);

    for (const fixture of calibrationModifierDefs) {
      const seed = seedModifiers.find(
        (row) =>
          row.stageSlug === fixture.stageSlug &&
          row.triggerQuestionSlug === fixture.triggerQuestionSlug &&
          row.triggerValue === fixture.triggerValue &&
          row.costAdjustmentPerM2 === fixture.costAdjustmentPerM2 &&
          row.fixedCostAdjustment === fixture.fixedCostAdjustment &&
          row.description === fixture.description,
      );
      expect(
        seed,
        `missing seed modifier for ${fixture.stageSlug} / ${fixture.triggerQuestionSlug}=${fixture.triggerValue}`,
      ).toBeDefined();
    }
  });

  it("keeps market-benchmarks.json neutral (S-01 calibration contract)", () => {
    const jsonPath = path.resolve(
      import.meta.dirname,
      "../../../prisma/data/market-benchmarks.json",
    );
    const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as Array<{
      stageCategory: string;
      multiplier: number;
    }>;

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.multiplier, row.stageCategory).toBe(1);
    }
  });
});
