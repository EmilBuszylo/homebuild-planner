"use client";

import type { Control } from "react-hook-form";

import type { QuestionDefinition } from "@/lib/types/domain";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";
import { QuestionField } from "./question-renderers";

const STEP_TITLES = [
  "Stan i standard budowy",
  "Parametry budynku",
  "Okna, drzwi i termin",
];

export const STEP_FIELDS: Record<number, (keyof QuestionnaireInputs)[]> = {
  0: ["investment_state", "build_standard", "insulation_level"],
  1: ["area", "floors", "has_attic", "garage_spots"],
  2: ["window_count", "exterior_door_count", "has_terrace_doors", "key_date"],
};

interface StepContentProps {
  stepIndex: number;
  questions: QuestionDefinition[];
  control: Control<QuestionnaireInputs>;
}

export function StepContent({
  stepIndex,
  questions,
  control,
}: StepContentProps) {
  const slugs = STEP_FIELDS[stepIndex] ?? [];
  const stepQuestions = slugs
    .map((slug) => questions.find((q) => q.slug === slug))
    .filter((q): q is QuestionDefinition => q !== undefined);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{STEP_TITLES[stepIndex]}</h2>
      {stepQuestions.map((question) => (
        <QuestionField
          key={question.slug}
          question={question}
          control={control}
        />
      ))}
    </div>
  );
}
