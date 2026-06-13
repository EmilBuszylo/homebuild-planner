"use client";

import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";

import {
  getAllowedStartingStates,
  getAllowedTargetStates,
} from "@/lib/investment-state";
import type { QuestionDefinition } from "@/lib/types/domain";
import {
  needsUtilityDistanceBand,
  type QuestionnaireInputs,
} from "@/lib/validations/questionnaire";

import { QuestionField } from "./question-renderers";

const STEP_TITLES = [
  "Stan i standard budowy",
  "Parametry budynku",
  "Okna, drzwi i termin",
  "Przyłącza mediów",
];

export const STEP_FIELDS: Record<number, (keyof QuestionnaireInputs)[]> = {
  0: ["starting_state", "investment_state", "build_standard", "insulation_level"],
  1: ["area", "floors", "has_attic", "roof_type", "garage_spots", "balcony_count"],
  2: ["window_count", "exterior_door_count", "terrace_door_count", "key_date"],
  3: ["sewage_disposal", "water_supply", "utility_distance_band"],
};

export function getStepFieldSlugs(
  stepIndex: number,
  sewageDisposal?: QuestionnaireInputs["sewage_disposal"],
  waterSupply?: QuestionnaireInputs["water_supply"],
): (keyof QuestionnaireInputs)[] {
  const base = STEP_FIELDS[stepIndex];
  if (!base) return [];
  if (stepIndex !== 3) return base;
  if (needsUtilityDistanceBand(sewageDisposal ?? "MUNICIPAL", waterSupply ?? "MUNICIPAL")) {
    return base;
  }
  return base.filter((slug) => slug !== "utility_distance_band");
}

type QuestionOption = { value: string; label: string };

function filterStateQuestionOptions(
  question: QuestionDefinition,
  startingState: string | undefined,
  targetState: string | undefined,
): QuestionDefinition {
  const options = (question.options as QuestionOption[] | null) ?? [];

  if (question.slug === "investment_state" && startingState) {
    const allowed = new Set<string>(getAllowedTargetStates(startingState));
    return {
      ...question,
      options: options.filter((o) => allowed.has(o.value)),
    };
  }

  if (question.slug === "starting_state" && targetState) {
    const allowed = new Set<string>(getAllowedStartingStates(targetState));
    return {
      ...question,
      options: options.filter((o) => allowed.has(o.value)),
    };
  }

  return question;
}

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
  const startingState = useWatch({ control, name: "starting_state" });
  const targetState = useWatch({ control, name: "investment_state" });
  const sewageDisposal = useWatch({ control, name: "sewage_disposal" });
  const waterSupply = useWatch({ control, name: "water_supply" });

  const slugs = getStepFieldSlugs(stepIndex, sewageDisposal, waterSupply);
  const stepQuestions = slugs
    .map((slug) => questions.find((q) => q.slug === slug))
    .filter((q): q is QuestionDefinition => q !== undefined)
    .map((question) =>
      stepIndex === 0
        ? filterStateQuestionOptions(question, startingState, targetState)
        : question,
    );

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
