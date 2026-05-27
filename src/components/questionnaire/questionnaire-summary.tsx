"use client";

import type { UseFormGetValues } from "react-hook-form";

import type { QuestionDefinition } from "@/lib/types/domain";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuestionOption = { value: string; label: string };

const STEP_GROUPS: { name: string; slugs: (keyof QuestionnaireInputs)[] }[] = [
  {
    name: "Stan i standard budowy",
    slugs: [
      "investment_state",
      "starting_state",
      "build_standard",
      "insulation_level",
    ],
  },
  {
    name: "Parametry budynku",
    slugs: ["area", "floors", "has_attic", "garage_spots", "balcony_count"],
  },
  {
    name: "Okna, drzwi i termin",
    slugs: [
      "window_count",
      "exterior_door_count",
      "terrace_door_count",
      "key_date",
    ],
  },
];

function formatAnswer(question: QuestionDefinition, value: unknown): string {
  if (value === undefined || value === null) return "—";

  switch (question.type) {
    case "SINGLE_CHOICE": {
      const options = (question.options as QuestionOption[] | null) ?? [];
      const match = options.find((o) => o.value === value);
      return match?.label ?? String(value);
    }
    case "NUMBER": {
      const suffix = question.unit ? ` ${question.unit}` : "";
      return `${value}${suffix}`;
    }
    case "DATE":
      return String(value);
    case "BOOLEAN":
      return value ? "Tak" : "Nie";
    default:
      return String(value);
  }
}

interface QuestionnaireSummaryProps {
  questions: QuestionDefinition[];
  getValues: UseFormGetValues<QuestionnaireInputs>;
}

export function QuestionnaireSummary({
  questions,
  getValues,
}: QuestionnaireSummaryProps) {
  const values = getValues();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Podsumowanie</h2>
      <p className="text-sm text-muted-foreground">
        Sprawdź swoje odpowiedzi przed wysłaniem ankiety.
      </p>

      {STEP_GROUPS.map((group) => (
        <Card key={group.name}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {group.slugs.map((slug) => {
              const question = questions.find((q) => q.slug === slug);
              if (!question) return null;
              return (
                <div
                  key={slug}
                  className="flex items-baseline justify-between border-b py-2.5 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {question.label}
                  </span>
                  <span className="ml-4 text-sm font-medium">
                    {formatAnswer(question, values[slug])}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
