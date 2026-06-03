import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

/** DB-shaped rows from validated questionnaire inputs (string values per slug). */
export function payloadToStoredRows(
  payload: QuestionnaireInputs,
): { questionSlug: string; value: string }[] {
  return Object.entries(payload).map(([questionSlug, value]) => ({
    questionSlug,
    value: String(value),
  }));
}
