import { describe, expect, it } from "vitest";

import {
  formatNumberFieldValue,
  isIncompleteNumberInput,
  parseQuestionnaireNumberInput,
  readQuestionNumberLimits,
} from "./parse-number-input";

describe("parseQuestionnaireNumberInput", () => {
  it("parses integer strings", () => {
    expect(parseQuestionnaireNumberInput("2")).toBe(2);
    expect(parseQuestionnaireNumberInput("0")).toBe(0);
  });

  it("returns undefined for empty or lone minus (in-progress edit)", () => {
    expect(parseQuestionnaireNumberInput("")).toBeUndefined();
    expect(parseQuestionnaireNumberInput("-")).toBeUndefined();
  });

  it("returns undefined for non-numeric text", () => {
    expect(parseQuestionnaireNumberInput("abc")).toBeUndefined();
  });
});

describe("isIncompleteNumberInput", () => {
  it("flags partial numeric edits", () => {
    expect(isIncompleteNumberInput("-")).toBe(true);
    expect(isIncompleteNumberInput("12.")).toBe(true);
    expect(isIncompleteNumberInput("")).toBe(true);
    expect(isIncompleteNumberInput("3")).toBe(false);
  });
});

describe("formatNumberFieldValue", () => {
  it("maps nullish to empty string", () => {
    expect(formatNumberFieldValue(undefined)).toBe("");
    expect(formatNumberFieldValue(null)).toBe("");
    expect(formatNumberFieldValue(4)).toBe("4");
  });
});

describe("readQuestionNumberLimits", () => {
  it("reads min and max from seed validation JSON", () => {
    expect(readQuestionNumberLimits({ min: 0, max: 5 })).toEqual({
      min: 0,
      max: 5,
    });
  });

  it("returns empty limits for null or invalid shapes", () => {
    expect(readQuestionNumberLimits(null)).toEqual({});
    expect(readQuestionNumberLimits("bad")).toEqual({});
  });
});
