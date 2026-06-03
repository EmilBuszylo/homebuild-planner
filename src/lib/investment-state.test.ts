import { describe, expect, it } from "vitest";

import {
  getAllowedStartingStates,
  getAllowedTargetStates,
  isStartingStateBeforeTarget,
  pickDefaultStartingForTarget,
  pickDefaultTargetForStarting,
  STARTING_STATE_VALUES,
  TARGET_STATE_VALUES,
} from "./investment-state";

describe("isStartingStateBeforeTarget", () => {
  it("allows FROM_SCRATCH before DEVELOPER", () => {
    expect(isStartingStateBeforeTarget("FROM_SCRATCH", "DEVELOPER")).toBe(true);
  });

  it("rejects CLOSED_SHELL before OPEN_SHELL", () => {
    expect(isStartingStateBeforeTarget("CLOSED_SHELL", "OPEN_SHELL")).toBe(
      false,
    );
  });

  it("rejects equal states (FOUNDATIONS → FOUNDATIONS)", () => {
    expect(isStartingStateBeforeTarget("FOUNDATIONS", "FOUNDATIONS")).toBe(
      false,
    );
  });

  it("rejects unknown state values", () => {
    expect(isStartingStateBeforeTarget("INVALID", "DEVELOPER")).toBe(false);
    expect(isStartingStateBeforeTarget("FROM_SCRATCH", "INVALID")).toBe(false);
  });
});

describe("getAllowedTargetStates", () => {
  it("returns only targets strictly after the chosen start", () => {
    const starting = "FROM_SCRATCH";
    const allowed = getAllowedTargetStates(starting);

    expect(allowed.length).toBeGreaterThan(0);
    for (const target of allowed) {
      expect(isStartingStateBeforeTarget(starting, target)).toBe(true);
    }
    for (const target of TARGET_STATE_VALUES) {
      if (!allowed.includes(target)) {
        expect(isStartingStateBeforeTarget(starting, target)).toBe(false);
      }
    }
  });

  it("returns only DEVELOPER when start is CLOSED_SHELL", () => {
    expect(getAllowedTargetStates("CLOSED_SHELL")).toEqual(["DEVELOPER"]);
  });
});

describe("getAllowedStartingStates", () => {
  it("returns only starts strictly before the chosen target", () => {
    const target = "DEVELOPER";
    const allowed = getAllowedStartingStates(target);

    expect(allowed.length).toBeGreaterThan(0);
    for (const starting of allowed) {
      expect(isStartingStateBeforeTarget(starting, target)).toBe(true);
    }
    for (const starting of STARTING_STATE_VALUES) {
      if (!allowed.includes(starting)) {
        expect(isStartingStateBeforeTarget(starting, target)).toBe(false);
      }
    }
  });

  it("excludes CLOSED_SHELL and DEVELOPER when target is OPEN_SHELL", () => {
    const allowed = getAllowedStartingStates("OPEN_SHELL");
    expect(allowed).toEqual(["FROM_SCRATCH", "FOUNDATIONS"]);
  });
});

describe("default pickers", () => {
  it("pickDefaultTargetForStarting returns the first allowed target", () => {
    const starting = "FROM_SCRATCH";
    const allowed = getAllowedTargetStates(starting);
    expect(pickDefaultTargetForStarting(starting)).toBe(allowed[0]);
    expect(isStartingStateBeforeTarget(starting, allowed[0])).toBe(true);
  });

  it("pickDefaultStartingForTarget returns the first allowed start", () => {
    const target = "DEVELOPER";
    const allowed = getAllowedStartingStates(target);
    expect(pickDefaultStartingForTarget(target)).toBe(allowed[0]);
    expect(isStartingStateBeforeTarget(allowed[0], target)).toBe(true);
  });
});
