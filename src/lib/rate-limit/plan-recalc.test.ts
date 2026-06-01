import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlanRecalcPolicy } from "./plan-recalc";

describe("getPlanRecalcPolicy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses default limit and window when env is unset", () => {
    vi.unstubAllEnvs();

    expect(getPlanRecalcPolicy()).toEqual({ limit: 3, windowHours: 24 });
  });

  it("reads PLAN_RECALC_LIMIT and PLAN_RECALC_WINDOW_HOURS from env", () => {
    vi.stubEnv("PLAN_RECALC_LIMIT", "5");
    vi.stubEnv("PLAN_RECALC_WINDOW_HOURS", "12");

    expect(getPlanRecalcPolicy()).toEqual({ limit: 5, windowHours: 12 });
  });

  it("falls back to defaults for invalid env values", () => {
    vi.stubEnv("PLAN_RECALC_LIMIT", "abc");
    vi.stubEnv("PLAN_RECALC_WINDOW_HOURS", "0");

    expect(getPlanRecalcPolicy()).toEqual({ limit: 3, windowHours: 24 });
  });
});
