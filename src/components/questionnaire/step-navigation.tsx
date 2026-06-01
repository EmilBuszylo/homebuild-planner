"use client";

import { Button } from "@/components/ui/button";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  submitLabel = "Zatwierdź",
  submittingLabel = "Wysyłanie...",
}: StepNavigationProps) {
  const isSummary = currentStep === totalSteps - 1;

  return (
    <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
      {currentStep > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Wstecz
        </Button>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}

      {isSummary ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          className="w-full sm:ml-auto sm:w-auto"
        >
          Dalej
        </Button>
      )}
    </div>
  );
}
