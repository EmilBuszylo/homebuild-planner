import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

export type ChoiceHint = {
  short: string;
  expanded?: string;
};

export type QuestionHint = {
  short: string;
  expanded?: string;
  /** Hinty przy poszczególnych opcjach (np. wartości SINGLE_CHOICE). Klucz = `option.value`. */
  choices?: Record<string, ChoiceHint>;
};

export type QuestionSlug = keyof QuestionnaireInputs;

export type QuestionHintsMap = Record<QuestionSlug, QuestionHint>;

/** Locale’y z hintami na froncie — rozszerz o `"en"` gdy dodasz `hints/en.ts`. */
export type HintLocale = "pl";
