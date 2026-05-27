import type { BuildStandard } from "@/lib/validations/questionnaire";
import type { StageCostModifier } from "@/lib/types/domain";

import { getStageBillingArea, getUsableArea } from "./effective-area";
import { parseModifierDescription } from "./parse-modifier";
import type { QuestionnaireResponsesMap, StageWithModifiers } from "./types";

function getCostPerM2ForStandard(
  stage: StageWithModifiers,
  buildStandard: BuildStandard,
): number {
  switch (buildStandard) {
    case "ECONOMY":
      return stage.costPerM2Economy;
    case "STANDARD":
      return stage.costPerM2Standard;
    case "PREMIUM":
      return stage.costPerM2Premium;
  }
}

function modifierMatches(
  modifier: StageCostModifier,
  responses: QuestionnaireResponsesMap,
): boolean {
  const actual = responses[modifier.triggerQuestionSlug];
  return actual !== undefined && actual === modifier.triggerValue;
}

function applyModifier(
  modifier: StageCostModifier,
  basePerM2: number,
  area: number,
  responses: QuestionnaireResponsesMap,
): number {
  const tag = parseModifierDescription(modifier.description);

  switch (tag.kind) {
    case "percent": {
      const baseAmount = basePerM2 * area;
      return (tag.percent / 100) * baseAmount;
    }
    case "per_unit": {
      const count = Number(responses[tag.unitSlug] ?? "0");
      return modifier.fixedCostAdjustment * count;
    }
    case "flat":
      return modifier.costAdjustmentPerM2 * area + modifier.fixedCostAdjustment;
  }
}

export function computeStageCost(
  stage: StageWithModifiers,
  responses: QuestionnaireResponsesMap,
): number {
  const buildStandard = responses.build_standard as BuildStandard | undefined;
  if (!buildStandard || getUsableArea(responses) <= 0) {
    return 0;
  }

  const billingArea = getStageBillingArea(stage.slug, responses);
  const basePerM2 = getCostPerM2ForStandard(stage, buildStandard);
  let total = basePerM2 * billingArea;

  for (const modifier of stage.costModifiers) {
    if (!modifierMatches(modifier, responses)) {
      continue;
    }
    total += applyModifier(modifier, basePerM2, billingArea, responses);
  }

  return Math.round(total);
}
