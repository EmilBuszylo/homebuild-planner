import type { DomainInvestmentState } from "@/lib/types/domain";

export const investmentStateOrder: Record<DomainInvestmentState, number> = {
  FROM_SCRATCH: 0,
  FOUNDATIONS: 1,
  OPEN_SHELL: 2,
  CLOSED_SHELL: 3,
  DEVELOPER: 4,
};

export const STATE_ORDER_ERROR_MESSAGE =
  "Stan startowy musi być wcześniejszy niż stan docelowy";

/** Wartości dozwolone w ankiecie (zgodne z Zod / seed). */
export const TARGET_STATE_VALUES = [
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
  "DEVELOPER",
] as const;

export const STARTING_STATE_VALUES = [
  "FROM_SCRATCH",
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
] as const;

export type TargetStateValue = (typeof TARGET_STATE_VALUES)[number];
export type StartingStateValue = (typeof STARTING_STATE_VALUES)[number];

export function getInvestmentStateOrder(
  state: DomainInvestmentState | null | undefined,
): number | null {
  if (state == null) {
    return null;
  }
  return investmentStateOrder[state];
}

export function getStateOrder(state: string | undefined): number | null {
  if (!state || !(state in investmentStateOrder)) {
    return null;
  }
  return investmentStateOrder[state as DomainInvestmentState];
}

export function compareInvestmentState(
  a: DomainInvestmentState,
  b: DomainInvestmentState,
): number {
  return investmentStateOrder[a] - investmentStateOrder[b];
}

/** Strict `<` — ten sam etap (np. FOUNDATIONS → FOUNDATIONS) jest nieważny. */
export function isStartingStateBeforeTarget(
  starting: string | undefined,
  target: string | undefined,
): boolean {
  const startingOrder = getStateOrder(starting);
  const targetOrder = getStateOrder(target);
  if (startingOrder === null || targetOrder === null) {
    return false;
  }
  return startingOrder < targetOrder;
}

export function getAllowedTargetStates(
  starting: string | undefined,
): TargetStateValue[] {
  const startingOrder = getStateOrder(starting);
  if (startingOrder === null) {
    return [...TARGET_STATE_VALUES];
  }
  return TARGET_STATE_VALUES.filter(
    (target) => getStateOrder(target)! > startingOrder,
  );
}

export function getAllowedStartingStates(
  target: string | undefined,
): StartingStateValue[] {
  const targetOrder = getStateOrder(target);
  if (targetOrder === null) {
    return [...STARTING_STATE_VALUES];
  }
  return STARTING_STATE_VALUES.filter(
    (starting) => getStateOrder(starting)! < targetOrder,
  );
}

export function pickDefaultTargetForStarting(
  starting: string | undefined,
): TargetStateValue {
  const allowed = getAllowedTargetStates(starting);
  return allowed[0] ?? "DEVELOPER";
}

export function pickDefaultStartingForTarget(
  target: string | undefined,
): StartingStateValue {
  const allowed = getAllowedStartingStates(target);
  return allowed[0] ?? "FROM_SCRATCH";
}
