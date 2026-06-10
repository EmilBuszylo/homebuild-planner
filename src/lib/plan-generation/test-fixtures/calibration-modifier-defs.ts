/**
 * Modifier definitions aligned with `prisma/seed.ts` (S-01 calibration).
 * Used only by `full-stages-calibration.ts` — not imported by production code.
 */
export type CalibrationModifierDef = {
  stageSlug: string;
  triggerQuestionSlug: string;
  triggerValue: string;
  costAdjustmentPerM2: number;
  fixedCostAdjustment: number;
  description: string;
};

export const calibrationModifierDefs: CalibrationModifierDef[] = [
  {
    stageSlug: "insulation",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 15,
    fixedCostAdjustment: 0,
    description:
      "[PERCENT:15] Wzmocnione ocieplenie — podwyższony standard izolacji",
  },
  {
    stageSlug: "foundations",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 60,
    fixedCostAdjustment: 0,
    description:
      "[PERCENT:15] Wzmocnione ocieplenie — izolacja fundamentów i posadzki",
  },
  {
    stageSlug: "roof_structure",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 30,
    fixedCostAdjustment: 0,
    description: "[PERCENT:15] Wzmocnione ocieplenie — ocieplenie stropu/dachu",
  },
  {
    stageSlug: "heating",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 18,
    fixedCostAdjustment: 0,
    description:
      "[PERCENT:15] Wzmocnione ocieplenie — wyższe wymagania instalacji grzewczej",
  },
  {
    stageSlug: "insulation",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 30,
    fixedCostAdjustment: 0,
    description: "[PERCENT:30] Ocieplenie pasywne — standard izolacji pasywnej",
  },
  {
    stageSlug: "foundations",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 120,
    fixedCostAdjustment: 0,
    description:
      "[PERCENT:30] Ocieplenie pasywne — izolacja fundamentów i posadzki",
  },
  {
    stageSlug: "roof_structure",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 60,
    fixedCostAdjustment: 0,
    description: "[PERCENT:30] Ocieplenie pasywne — ocieplenie stropu/dachu",
  },
  {
    stageSlug: "heating",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 36,
    fixedCostAdjustment: 0,
    description: "[PERCENT:30] Ocieplenie pasywne — rekuperacja i pompa ciepła",
  },
  {
    stageSlug: "heating",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 15300,
    description: "Kotłownia i źródło ciepła — standard ekonomiczny",
  },
  {
    stageSlug: "heating",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 21250,
    description: "Kotłownia i źródło ciepła — standard standardowy",
  },
  {
    stageSlug: "heating",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 32300,
    description: "Kotłownia i źródło ciepła — standard premium (pompa ciepła)",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 1500,
    description: "[PER_UNIT:window_count] Okno — standard ekonomiczny",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 2600,
    description: "[PER_UNIT:window_count] Okno — standard standardowy",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 4200,
    description: "[PER_UNIT:window_count] Okno — standard premium",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 2800,
    description:
      "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard ekonomiczny",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 7200,
    description:
      "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard standardowy",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 7800,
    description:
      "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard premium",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 3200,
    description:
      "[PER_UNIT:terrace_door_count] Drzwi tarasowe — balkonowe zwykłe",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 11000,
    description:
      "[PER_UNIT:terrace_door_count] Drzwi tarasowe — przesuwne system smart",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 15000,
    description: "[PER_UNIT:terrace_door_count] Drzwi tarasowe — przesuwne system HS",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 9000,
    description: "[PER_UNIT:balcony_count] Balkon — standard ekonomiczny",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 15000,
    description: "[PER_UNIT:balcony_count] Balkon — standard standardowy",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 22000,
    description: "[PER_UNIT:balcony_count] Balkon — standard premium",
  },
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 12000,
    description: "Brama garażowa — izolacja standardowa",
  },
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 14000,
    description: "Brama garażowa — podwyższona izolacja",
  },
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 16000,
    description: "Brama garażowa — klasa pasywna",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "has_attic",
    triggerValue: "true",
    costAdjustmentPerM2: 75,
    fixedCostAdjustment: 0,
    description: "Poddasze użytkowe — wzmocnienie stropu i schody wewnętrzne",
  },
  {
    stageSlug: "walls",
    triggerQuestionSlug: "floors",
    triggerValue: "2",
    costAdjustmentPerM2: 80,
    fixedCostAdjustment: 0,
    description: "Budynek dwukondygnacyjny — dodatkowa kondygnacja ścian",
  },
  {
    stageSlug: "walls",
    triggerQuestionSlug: "floors",
    triggerValue: "3",
    costAdjustmentPerM2: 150,
    fixedCostAdjustment: 0,
    description: "Budynek trzykondygnacyjny — dwie dodatkowe kondygnacje ścian",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "floors",
    triggerValue: "2",
    costAdjustmentPerM2: 70,
    fixedCostAdjustment: 0,
    description: "Dodatkowy strop międzykondygnacyjny",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "floors",
    triggerValue: "3",
    costAdjustmentPerM2: 140,
    fixedCostAdjustment: 0,
    description: "Dwa dodatkowe stropy międzykondygnacyjne",
  },
];
