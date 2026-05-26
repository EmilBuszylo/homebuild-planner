"use client";

import { Button } from "@/components/ui/button";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isSubmitting,
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Wysyłanie..." : "Zatwierdź"}
        </Button>
      ) : (
        <Button type="button" onClick={onNext}>
          Dalej
        </Button>
      )}
    </div>
  );
}
