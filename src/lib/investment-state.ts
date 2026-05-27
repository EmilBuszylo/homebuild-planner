import type { InvestmentState } from "@prisma/client";

export const investmentStateOrder: Record<InvestmentState, number> = {
  FROM_SCRATCH: 0,
  FOUNDATIONS: 1,
  OPEN_SHELL: 2,
  CLOSED_SHELL: 3,
  DEVELOPER: 4,
};

export function getInvestmentStateOrder(
  state: InvestmentState | null | undefined,
): number | null {
  if (state == null) {
    return null;
  }
  return investmentStateOrder[state];
}

export function compareInvestmentState(
  a: InvestmentState,
  b: InvestmentState,
): number {
  return investmentStateOrder[a] - investmentStateOrder[b];
}
