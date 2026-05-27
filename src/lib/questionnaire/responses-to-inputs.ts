import {
  questionnaireInputsSchema,
  type QuestionnaireInputs,
} from "@/lib/validations/questionnaire";

const NUMBER_SLUGS = new Set([
  "area",
  "floors",
  "garage_spots",
  "balcony_count",
  "window_count",
  "exterior_door_count",
  "terrace_door_count",
]);

function parseStoredValue(
  slug: string,
  value: string,
): string | number | boolean {
  if (slug === "has_attic") {
    return value === "true";
  }
  if (NUMBER_SLUGS.has(slug)) {
    return Number(value);
  }
  return value;
}

export function responsesToQuestionnaireInputs(
  rows: { questionSlug: string; value: string }[],
): QuestionnaireInputs {
  const raw = Object.fromEntries(
    rows.map((row) => [
      row.questionSlug,
      parseStoredValue(row.questionSlug, row.value),
    ]),
  );

  const parsed = questionnaireInputsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Nieprawidłowe zapisane odpowiedzi ankiety");
  }

  return parsed.data;
}
