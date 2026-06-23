import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  calibrationModifierDefs as sharedModifierDefs,
} from "./calibration/modifier-defs";
import {
  calibrationStageRateDefs as sharedStageRateDefs,
} from "./calibration/stage-rate-defs";
import { calibrationModifierDefs as fixtureModifierDefs } from "./test-fixtures/calibration-modifier-defs";
import { calibrationStageRateDefs as fixtureStageRateDefs } from "./test-fixtures/full-stages-calibration";

/**
 * Guards S-01 calibration drift between shared module, fixtures, and seed consumer.
 * Seed imports shared defs directly — no regex parse of prisma/seed.ts.
 */
describe("calibration shared module ↔ fixture parity", () => {
  it("fixtures re-export the shared stage rate defs", () => {
    expect(fixtureStageRateDefs).toBe(sharedStageRateDefs);
    expect(sharedStageRateDefs).toHaveLength(20);
  });

  it("matches stage PLN/m² tiers for all 20 slugs", () => {
    for (const def of sharedStageRateDefs) {
      expect(def.costPerM2Economy).toBeTypeOf("number");
      expect(def.costPerM2Standard).toBeTypeOf("number");
      expect(def.costPerM2Premium).toBeTypeOf("number");
    }
  });

  it("fixtures re-export the shared modifier defs", () => {
    expect(fixtureModifierDefs).toBe(sharedModifierDefs);
    expect(sharedModifierDefs.length).toBeGreaterThan(0);
  });

  it("matches modifier rows between shared module and fixtures", () => {
    expect(fixtureModifierDefs).toEqual(sharedModifierDefs);
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
