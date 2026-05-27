"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  isStartingStateBeforeTarget,
  pickDefaultTargetForStarting,
  STATE_ORDER_ERROR_MESSAGE,
} from "@/lib/investment-state";
import type { QuestionDefinition } from "@/lib/types/domain";
import {
  questionnaireFormSchema,
  questionnaireInputsSchema,
  type QuestionnaireInputs,
} from "@/lib/validations/questionnaire";
import { createZodResolver } from "@/lib/validations/zod-resolver";
import { routes } from "@/lib/routes";

import { StepProgress } from "./step-progress";
import { StepContent, STEP_FIELDS } from "./step-content";
import { StepNavigation } from "./step-navigation";
import { QuestionnaireSummary } from "./questionnaire-summary";

const TOTAL_STEPS = 4;

interface QuestionnaireFormProps {
  questions: QuestionDefinition[];
}

export function QuestionnaireForm({ questions }: QuestionnaireFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<QuestionnaireInputs>({
    resolver: createZodResolver(questionnaireFormSchema),
    defaultValues: {
      investment_state: "FOUNDATIONS",
      starting_state: "FROM_SCRATCH",
      has_attic: false,
      garage_spots: 0,
      balcony_count: 0,
      terrace_door_count: 0,
    },
  });

  const { clearErrors, setValue, getValues } = form;

  const isSummary = currentStep === TOTAL_STEPS - 1;

  const startingState = useWatch({
    control: form.control,
    name: "starting_state",
  });
  const investmentState = useWatch({
    control: form.control,
    name: "investment_state",
  });

  /** Utrzymuj parę start/cel w dozwolonym zbiorze (np. bez FOUNDATIONS→FOUNDATIONS). */
  useEffect(() => {
    if (!startingState || !investmentState) {
      return;
    }

    if (isStartingStateBeforeTarget(startingState, investmentState)) {
      clearErrors("starting_state");
      return;
    }

    const { starting_state, investment_state } = getValues();
    if (
      starting_state === startingState &&
      investment_state === investmentState
    ) {
      setValue("investment_state", pickDefaultTargetForStarting(startingState), {
        shouldValidate: true,
      });
      clearErrors("starting_state");
    }
  }, [startingState, investmentState, clearErrors, setValue, getValues]);

  async function handleNext() {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (!fieldsToValidate) return;

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) return;

    setCurrentStep((prev) => prev + 1);
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  async function onSubmit(values: QuestionnaireInputs) {
    setServerError(null);

    const parsed = questionnaireInputsSchema.safeParse(values);
    if (!parsed.success) {
      const stateError = parsed.error.issues.find(
        (issue) => issue.path[0] === "starting_state",
      );
      if (stateError) {
        form.setError("starting_state", {
          type: "manual",
          message: STATE_ORDER_ERROR_MESSAGE,
        });
        setCurrentStep(0);
        return;
      }
      setServerError("Nieprawidłowe dane ankiety. Sprawdź wszystkie kroki.");
      return;
    }

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (res.status === 201) {
        router.push(routes.plan(data.planId));
      } else if (res.status === 409) {
        router.push(routes.plan(data.planId));
      } else {
        setServerError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    } catch {
      setServerError(
        "Nie udało się wysłać ankiety. Sprawdź połączenie z internetem.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <StepProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="space-y-8"
      >
        {isSummary ? (
          <QuestionnaireSummary
            questions={questions}
            getValues={form.getValues}
          />
        ) : (
          <StepContent
            stepIndex={currentStep}
            questions={questions}
            control={form.control}
          />
        )}

        {serverError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {serverError}
          </p>
        )}

        <StepNavigation
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={() => form.handleSubmit(onSubmit)()}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </div>
  );
}
