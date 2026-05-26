import { z } from "zod";

export const investmentStateSchema = z.enum([
  "FROM_SCRATCH",
  "FOUNDATIONS",
  "OPEN_SHELL",
  "CLOSED_SHELL",
  "DEVELOPER",
]);

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

export const questionnaireResponseSchema = z.object({
  questionSlug: z.string().min(1, "Identyfikator pytania jest wymagany"),
  value: z.string().min(1, "Odpowiedź jest wymagana"),
});

export const questionnaireInputsSchema = z.object({
  investment_state: investmentStateSchema,
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
  has_terrace_doors: z.boolean().optional().default(false),
});

export type InvestmentState = z.infer<typeof investmentStateSchema>;
export type BuildStandard = z.infer<typeof buildStandardSchema>;
export type InsulationLevel = z.infer<typeof insulationLevelSchema>;
export type QuestionnaireResponse = z.infer<typeof questionnaireResponseSchema>;
export type QuestionnaireInputs = z.infer<typeof questionnaireInputsSchema>;
