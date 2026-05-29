import { questionHintsPl } from "@/lib/questionnaire/hints/pl";
import type {
  ChoiceHint,
  HintLocale,
  QuestionHint,
  QuestionSlug,
} from "@/lib/questionnaire/hints/types";

const hintsByLocale = {
  pl: questionHintsPl,
} as const satisfies Record<HintLocale, typeof questionHintsPl>;

export function getQuestionHint(
  slug: string,
  locale: HintLocale = "pl",
): QuestionHint | null {
  const map = hintsByLocale[locale];
  if (!(slug in map)) {
    return null;
  }
  return map[slug as QuestionSlug];
}

export function getQuestionChoiceHint(
  slug: string,
  choiceValue: string,
  locale: HintLocale = "pl",
): ChoiceHint | null {
  const hint = getQuestionHint(slug, locale);
  if (!hint?.choices) {
    return null;
  }
  return hint.choices[choiceValue] ?? null;
}

export function hasQuestionChoiceHints(
  slug: string,
  locale: HintLocale = "pl",
): boolean {
  const hint = getQuestionHint(slug, locale);
  return !!hint?.choices && Object.keys(hint.choices).length > 0;
}

export type {
  ChoiceHint,
  HintLocale,
  QuestionHint,
  QuestionSlug,
} from "@/lib/questionnaire/hints/types";
