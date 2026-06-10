import type { InvestmentState } from "@/lib/validations/questionnaire";
import { getInvestmentStateOrder } from "@/lib/investment-state";

import type {
  QuestionnaireResponsesMap,
  StageWithModifiers,
} from "./types";

function getResponse(
  responses: QuestionnaireResponsesMap,
  slug: string,
): string | undefined {
  return responses[slug];
}

export function filterStages(
  stages: StageWithModifiers[],
  responses: QuestionnaireResponsesMap,
): StageWithModifiers[] {
  const starting = getResponse(responses, "starting_state") as
    | InvestmentState
    | undefined;
  const target = getResponse(responses, "investment_state");
  const garageSpots = Number(getResponse(responses, "garage_spots") ?? "0");

  if (!starting || !target) {
    return [];
  }

  const startingOrder = getInvestmentStateOrder(starting);
  const targetOrder = getInvestmentStateOrder(target as InvestmentState);

  if (startingOrder === null || targetOrder === null) {
    return [];
  }

  const waterSupply = getResponse(responses, "water_supply");

  return stages.filter((stage) => {
    if (stage.slug === "garage_gate" && garageSpots <= 0) {
      return false;
    }

    if (stage.slug === "water_connection" && waterSupply === "NONE") {
      return false;
    }

    const completed = stage.completedByState;
    const completedOrder = getInvestmentStateOrder(completed);

    if (completed === null) {
      return target === "DEVELOPER";
    }

    if (completedOrder === null) {
      return false;
    }

    if (completedOrder <= startingOrder) {
      return false;
    }

    if (completedOrder > targetOrder) {
      return false;
    }

    return true;
  });
}
