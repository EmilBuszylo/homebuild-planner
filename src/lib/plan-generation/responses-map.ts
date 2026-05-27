import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

import type { QuestionnaireResponsesMap } from "./types";

/** Map validated questionnaire input to string values stored in DB / used by the engine. */
export function toQuestionnaireResponsesMap(
  inputs: QuestionnaireInputs,
): QuestionnaireResponsesMap {
  return Object.fromEntries(
    Object.entries(inputs).map(([slug, value]) => [slug, String(value)]),
  );
}
