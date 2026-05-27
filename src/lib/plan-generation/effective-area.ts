import type { QuestionnaireResponsesMap } from "./types";

/**
 * Fundamenty — powierzchnia zabudowy (użytkowa ÷ kondygnacje), nie pełna pow. użytkowa.
 * Stropy liczymy od pełnej powierzchni użytkowej (wylewki ~m² użytkowych budynku).
 */
const FOOTPRINT_BILLED_STAGES = new Set(["foundations"]);

export function getUsableArea(responses: QuestionnaireResponsesMap): number {
  const area = Number(responses.area);
  return Number.isFinite(area) && area > 0 ? area : 0;
}

/** Approximate footprint (m²) from total usable area and floor count. */
export function getFootprintArea(responses: QuestionnaireResponsesMap): number {
  const usable = getUsableArea(responses);
  const floors = Math.max(1, Number(responses.floors) || 1);
  return usable / floors;
}

/** Area multiplier used for a stage's per-m² base and per-m² modifiers. */
export function getStageBillingArea(
  stageSlug: string,
  responses: QuestionnaireResponsesMap,
): number {
  if (FOOTPRINT_BILLED_STAGES.has(stageSlug)) {
    return getFootprintArea(responses);
  }
  return getUsableArea(responses);
}
