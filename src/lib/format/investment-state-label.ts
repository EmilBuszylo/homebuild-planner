/** Etykiety zgodne z `prisma/seed.ts` (pytania ankiety). */
export const INVESTMENT_STATE_LABELS: Record<string, string> = {
  FROM_SCRATCH: "Od zera (działka)",
  FOUNDATIONS: "Stan zero (fundamenty)",
  OPEN_SHELL: "Stan surowy otwarty",
  CLOSED_SHELL: "Stan surowy zamknięty",
  DEVELOPER: "Stan deweloperski",
};

export function formatInvestmentStateLabel(value: string): string {
  return INVESTMENT_STATE_LABELS[value] ?? value;
}

/** Zakres planu: skąd startujemy → do jakiego celu. */
export function formatPlanScope(startingState: string, targetState: string): string {
  return `${formatInvestmentStateLabel(startingState)} → ${formatInvestmentStateLabel(targetState)}`;
}
