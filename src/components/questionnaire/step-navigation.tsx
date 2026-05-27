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
    <div className="flex items-center justify-between pt-4">
      {currentStep > 0 ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Wstecz
        </Button>
      ) : (
        <div />
      )}

      {isSummary ? (
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      ) : (
        <Button type="button" onClick={onNext}>
          Dalej
        </Button>
      )}
    </div>
  );
}
