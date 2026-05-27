import { z } from "zod";

/** Wszystkie wartości enum w DB (kolejność etapów budowy). */
export const investmentStateSchema = z.enum([
  "FROM_SCRATCH",
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
  "DEVELOPER",
]);

export type InvestmentState = z.infer<typeof investmentStateSchema>;

/** Stan docelowy — bez „od zera”. */
export const targetStateSchema = z.enum([
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
  "DEVELOPER",
]);

export type TargetState = z.infer<typeof targetStateSchema>;

/** Stan startowy — bez stanu deweloperskiego. */
export const startingStateSchema = z.enum([
  "FROM_SCRATCH",
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
]);

export type StartingState = z.infer<typeof startingStateSchema>;

export const buildStandardSchema = z.enum([
  "ECONOMY",
  "STANDARD",
  "PREMIUM",
]);

export const insulationLevelSchema = z.enum([
  "STANDARD",
  "ENHANCED",
  "PASSIVE",
]);

const investmentStateOrder: Record<InvestmentState, number> = {
  FROM_SCRATCH: 0,
  FOUNDATIONS: 1,
  OPEN_SHELL: 2,
  CLOSED_SHELL: 3,
  DEVELOPER: 4,
};

export function isStartingStateBeforeTarget(
  starting: StartingState,
  target: TargetState,
): boolean {
  return investmentStateOrder[starting] < investmentStateOrder[target];
}

export const questionnaireResponseSchema = z.object({
  questionSlug: z.string().min(1, "Identyfikator pytania jest wymagany"),
  value: z.string().min(1, "Odpowiedź jest wymagana"),
});

const questionnaireInputsBaseSchema = z.object({
  investment_state: targetStateSchema,
  starting_state: startingStateSchema,
  build_standard: buildStandardSchema,
  insulation_level: insulationLevelSchema,
  area: z
    .number()
    .min(50, "Minimalna powierzchnia to 50 m²")
    .max(500, "Maksymalna powierzchnia to 500 m²"),
  key_date: z.string().date("Podaj poprawną datę (RRRR-MM-DD)"),
  floors: z
    .number()
    .int("Liczba kondygnacji musi być liczbą całkowitą")
    .min(1, "Minimalna liczba kondygnacji to 1")
    .max(3, "Maksymalna liczba kondygnacji to 3"),
  has_attic: z.boolean().optional().default(false),
  garage_spots: z
    .number()
    .int("Liczba miejsc garażowych musi być liczbą całkowitą")
    .min(0, "Minimalna liczba miejsc garażowych to 0")
    .max(3, "Maksymalna liczba miejsc garażowych to 3")
    .optional()
    .default(0),
  balcony_count: z
    .number()
    .int("Liczba balkonów musi być liczbą całkowitą")
    .min(0, "Minimalna liczba balkonów to 0")
    .max(4, "Maksymalna liczba balkonów to 4")
    .optional()
    .default(0),
  window_count: z
    .number()
    .int("Liczba okien musi być liczbą całkowitą")
    .min(1, "Minimalna liczba okien to 1")
    .max(30, "Maksymalna liczba okien to 30"),
  exterior_door_count: z
    .number()
    .int("Liczba drzwi musi być liczbą całkowitą")
    .min(1, "Minimalna liczba drzwi zewnętrznych to 1")
    .max(5, "Maksymalna liczba drzwi zewnętrznych to 5"),
  terrace_door_count: z
    .number()
    .int("Liczba drzwi tarasowych musi być liczbą całkowitą")
    .min(0, "Minimalna liczba drzwi tarasowych to 0")
    .max(5, "Maksymalna liczba drzwi tarasowych to 5")
    .optional()
    .default(0),
});

export const questionnaireInputsSchema = questionnaireInputsBaseSchema.refine(
  (data) =>
    isStartingStateBeforeTarget(data.starting_state, data.investment_state),
  {
    message: "Stan startowy musi być wcześniejszy niż stan docelowy",
    path: ["starting_state"],
  },
);

export type BuildStandard = z.infer<typeof buildStandardSchema>;
export type InsulationLevel = z.infer<typeof insulationLevelSchema>;
export type QuestionnaireResponseInput = z.infer<
  typeof questionnaireResponseSchema
>;
export type QuestionnaireInputs = z.infer<typeof questionnaireInputsBaseSchema>;
