import { describe, expect, it } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";

import { responsesToQuestionnaireInputs } from "./responses-to-inputs";
import { payloadToStoredRows } from "./test-fixtures/stored-responses";

describe("responsesToQuestionnaireInputs", () => {
  it("parses golden stored rows into questionnaire inputs", () => {
    const rows = payloadToStoredRows(validQuestionnairePayload);
    const parsed = responsesToQuestionnaireInputs(rows);

    expect(parsed).toEqual(validQuestionnairePayload);
  });

  it("throws when stored rows have invalid state order", () => {
    const rows = payloadToStoredRows({
      ...validQuestionnairePayload,
      starting_state: "CLOSED_SHELL",
      investment_state: "FOUNDATIONS",
    });

    expect(() => responsesToQuestionnaireInputs(rows)).toThrow(
      "Nieprawidłowe zapisane odpowiedzi ankiety",
    );
  });

  it("throws when stored area is below minimum", () => {
    const rows = payloadToStoredRows({
      ...validQuestionnairePayload,
      area: 10,
    });

    expect(() => responsesToQuestionnaireInputs(rows)).toThrow(
      "Nieprawidłowe zapisane odpowiedzi ankiety",
    );
  });
});
