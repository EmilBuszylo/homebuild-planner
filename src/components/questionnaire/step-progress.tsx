"use client";

import { Progress } from "@/components/ui/progress";

const STEP_NAMES = [
  "Stan i standard",
  "Parametry budynku",
  "Okna, drzwi i termin",
  "Przyłącza mediów",
  "Podsumowanie",
];

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Krok {currentStep + 1} z {totalSteps}
        </span>
        <span className="font-medium">{STEP_NAMES[currentStep]}</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}
