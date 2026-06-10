import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

/**
 * Golden API payload — requirements-based (PRD ranges, valid start < target).
 * Shared by schema unit tests and route handler tests (Phase 2+).
 */
export const validQuestionnairePayload = {
  investment_state: "DEVELOPER",
  starting_state: "FROM_SCRATCH",
  build_standard: "STANDARD",
  insulation_level: "STANDARD",
  area: 120,
  key_date: "2026-09-01",
  floors: 2,
  has_attic: false,
  garage_spots: 1,
  balcony_count: 1,
  window_count: 12,
  exterior_door_count: 2,
  terrace_door_count: 0,
  sewage_disposal: "MUNICIPAL",
  water_supply: "MUNICIPAL",
  utility_distance_band: "UP_TO_50M",
} satisfies QuestionnaireInputs;
