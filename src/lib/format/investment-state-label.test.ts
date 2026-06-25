import { describe, expect, it } from "vitest";

import {
  formatInvestmentStateLabel,
  formatPlanScope,
} from "./investment-state-label";

describe("investment-state-label", () => {
  it("formats plan scope for full developer path", () => {
    expect(
      formatPlanScope("FROM_SCRATCH", "DEVELOPER"),
    ).toBe("Od zera (działka) → Stan deweloperski");
  });

  it("formats narrow foundations target", () => {
    expect(formatInvestmentStateLabel("FOUNDATIONS")).toBe(
      "Stan zero (fundamenty)",
    );
  });
});
