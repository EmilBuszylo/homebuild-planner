import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PrismaClient,
  QuestionType,
  InvestmentState,
} from "@prisma/client";

const prisma = new PrismaClient();
const seedDir = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Question definitions
// ---------------------------------------------------------------------------

/** Stan docelowy — plan do którego dąży inwestor (bez „od zera”). */
const targetStateOptions = [
  { value: "FOUNDATIONS", label: "Stan zero (fundamenty)" },
  { value: "OPEN_SHELL", label: "Stan surowy otwarty" },
  { value: "CLOSED_SHELL", label: "Stan surowy zamknięty" },
  { value: "DEVELOPER", label: "Stan deweloperski" },
] as const;

/** Aktualny stan — skąd startujemy (bez stanu deweloperskiego). */
const startingStateOptions = [
  { value: "FROM_SCRATCH", label: "Od zera (działka)" },
  { value: "FOUNDATIONS", label: "Fundamenty gotowe" },
  { value: "OPEN_SHELL", label: "Stan surowy otwarty" },
  { value: "CLOSED_SHELL", label: "Stan surowy zamknięty" },
] as const;

const questions = [
  {
    slug: "investment_state",
    label: "Stan docelowy budowy",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 1,
    options: [...targetStateOptions],
    validation: null,
    unit: null,
  },
  {
    slug: "starting_state",
    label: "Aktualny stan budowy",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 2,
    options: [...startingStateOptions],
    validation: null,
    unit: null,
  },
  {
    slug: "build_standard",
    label: "Standard wykończenia",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 3,
    options: [
      { value: "ECONOMY", label: "Ekonomiczny" },
      { value: "STANDARD", label: "Standardowy" },
      { value: "PREMIUM", label: "Premium" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "insulation_level",
    label: "Poziom ocieplenia",
    type: QuestionType.SINGLE_CHOICE,
    required: true,
    sortOrder: 4,
    options: [
      { value: "STANDARD", label: "Standardowy" },
      { value: "ENHANCED", label: "Wzmocniony" },
      { value: "PASSIVE", label: "Pasywny" },
    ],
    validation: null,
    unit: null,
  },
  {
    slug: "area",
    label: "Powierzchnia użytkowa",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 5,
    options: null,
    validation: { min: 50, max: 500 },
    unit: "m²",
  },
  {
    slug: "floors",
    label: "Liczba kondygnacji",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 6,
    options: null,
    validation: { min: 1, max: 3 },
    unit: null,
  },
  {
    slug: "has_attic",
    label: "Poddasze użytkowe",
    type: QuestionType.BOOLEAN,
    required: false,
    sortOrder: 7,
    options: null,
    validation: null,
    unit: null,
  },
  {
    slug: "garage_spots",
    label: "Miejsca garażowe",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 8,
    options: null,
    validation: { min: 0, max: 3 },
    unit: "szt.",
  },
  {
    slug: "balcony_count",
    label: "Liczba balkonów",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 9,
    options: null,
    validation: { min: 0, max: 4 },
    unit: "szt.",
  },
  {
    slug: "window_count",
    label: "Liczba okien",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 10,
    options: null,
    validation: { min: 1, max: 30 },
    unit: "szt.",
  },
  {
    slug: "exterior_door_count",
    label: "Liczba drzwi zewnętrznych",
    type: QuestionType.NUMBER,
    required: true,
    sortOrder: 11,
    options: null,
    validation: { min: 1, max: 5 },
    unit: "szt.",
  },
  {
    slug: "terrace_door_count",
    label: "Liczba drzwi tarasowych",
    type: QuestionType.NUMBER,
    required: false,
    sortOrder: 12,
    options: null,
    validation: { min: 0, max: 5 },
    unit: "szt.",
  },
  {
    slug: "key_date",
    label: "Planowana data rozpoczęcia budowy",
    type: QuestionType.DATE,
    required: true,
    sortOrder: 13,
    options: null,
    validation: null,
    unit: null,
  },
] as const;

// ---------------------------------------------------------------------------
// Construction stages — 2025/2026 Polish market rates (PLN per m² usable area)
// ---------------------------------------------------------------------------

const stages = [
  // --- STRUCTURE ---
  {
    slug: "foundations",
    name: "Fundamenty",
    description: "Wykopy, ławy/płyta fundamentowa, izolacja przeciwwilgociowa i termiczna",
    category: "STRUCTURE",
    sortOrder: 1,
    completedByState: InvestmentState.FOUNDATIONS,
    predecessorSlugs: [],
    costPerM2Economy: 500,
    costPerM2Standard: 690,
    costPerM2Premium: 880,
    durationMinDays: 14,
    durationMaxDays: 28,
  },
  {
    slug: "walls",
    name: "Ściany nośne",
    description: "Murowanie ścian nośnych i działowych, nadproża",
    category: "STRUCTURE",
    sortOrder: 2,
    completedByState: InvestmentState.OPEN_SHELL,
    predecessorSlugs: ["foundations"],
    costPerM2Economy: 350,
    costPerM2Standard: 500,
    costPerM2Premium: 700,
    durationMinDays: 21,
    durationMaxDays: 42,
  },
  {
    slug: "floor_slabs",
    name: "Stropy i nadproża",
    description: "Stropy żelbetowe, wieńce, nadproża okienne i drzwiowe",
    category: "STRUCTURE",
    sortOrder: 3,
    completedByState: InvestmentState.OPEN_SHELL,
    predecessorSlugs: ["walls"],
    costPerM2Economy: 220,
    costPerM2Standard: 300,
    costPerM2Premium: 420,
    durationMinDays: 7,
    durationMaxDays: 21,
  },
  {
    slug: "roof_structure",
    name: "Konstrukcja dachu",
    description: "Więźba dachowa, łacenie, folia wstępnego krycia",
    category: "STRUCTURE",
    sortOrder: 4,
    completedByState: InvestmentState.OPEN_SHELL,
    predecessorSlugs: ["floor_slabs"],
    costPerM2Economy: 165,
    costPerM2Standard: 235,
    costPerM2Premium: 360,
    durationMinDays: 10,
    durationMaxDays: 21,
  },
  {
    slug: "roof_covering",
    name: "Pokrycie dachu",
    description: "Dachówka lub blachodachówka, obróbki blacharskie, rynny",
    category: "STRUCTURE",
    sortOrder: 5,
    completedByState: InvestmentState.CLOSED_SHELL,
    predecessorSlugs: ["roof_structure"],
    costPerM2Economy: 130,
    costPerM2Standard: 185,
    costPerM2Premium: 290,
    durationMinDays: 7,
    durationMaxDays: 14,
  },
  {
    slug: "windows_doors",
    name: "Okna i drzwi zewnętrzne",
    description: "Wycena na sztuki: okna, drzwi zewnętrzne, drzwi tarasowe. Koszt bazowy = 0 (obliczany z modyfikatorów × ilości)",
    category: "STRUCTURE",
    sortOrder: 6,
    completedByState: InvestmentState.CLOSED_SHELL,
    predecessorSlugs: ["roof_covering"],
    costPerM2Economy: 0,
    costPerM2Standard: 0,
    costPerM2Premium: 0,
    durationMinDays: 3,
    durationMaxDays: 7,
  },

  // --- INSTALLATIONS ---
  {
    slug: "electrical",
    name: "Instalacja elektryczna",
    description: "Prowadzenie przewodów, puszki, rozdzielnia — stan surowy",
    category: "INSTALLATIONS",
    sortOrder: 7,
    completedByState: InvestmentState.DEVELOPER,
    predecessorSlugs: ["walls"],
    costPerM2Economy: 100,
    costPerM2Standard: 150,
    costPerM2Premium: 250,
    durationMinDays: 7,
    durationMaxDays: 14,
  },
  {
    slug: "plumbing",
    name: "Instalacja wodno-kanalizacyjna",
    description: "Rury wodne i kanalizacyjne, podejścia pod urządzenia",
    category: "INSTALLATIONS",
    sortOrder: 8,
    completedByState: InvestmentState.DEVELOPER,
    predecessorSlugs: ["walls"],
    costPerM2Economy: 80,
    costPerM2Standard: 130,
    costPerM2Premium: 200,
    durationMinDays: 7,
    durationMaxDays: 14,
  },
  {
    slug: "heating",
    name: "Instalacja centralnego ogrzewania",
    description: "Źródło ciepła (kocioł gazowy/pompa ciepła), orurowanie, grzejniki lub ogrzewanie podłogowe",
    category: "INSTALLATIONS",
    sortOrder: 9,
    completedByState: InvestmentState.DEVELOPER,
    predecessorSlugs: ["walls", "floor_slabs"],
    costPerM2Economy: 120,
    costPerM2Standard: 220,
    costPerM2Premium: 400,
    durationMinDays: 10,
    durationMaxDays: 21,
  },

  // --- ENVELOPE ---
  {
    slug: "insulation",
    name: "Ocieplenie",
    description: "Termoizolacja ścian zewnętrznych (styropian/wełna), ocieplenie poddasza",
    category: "ENVELOPE",
    sortOrder: 10,
    completedByState: null,
    predecessorSlugs: ["windows_doors"],
    costPerM2Economy: 100,
    costPerM2Standard: 160,
    costPerM2Premium: 250,
    durationMinDays: 10,
    durationMaxDays: 21,
  },
  {
    slug: "facade",
    name: "Elewacja",
    description: "Tynk elewacyjny, cokół, obróbki",
    category: "ENVELOPE",
    sortOrder: 11,
    completedByState: null,
    predecessorSlugs: ["insulation"],
    costPerM2Economy: 80,
    costPerM2Standard: 120,
    costPerM2Premium: 200,
    durationMinDays: 10,
    durationMaxDays: 21,
  },

  // --- INTERIOR FINISHING ---
  {
    slug: "interior_plaster",
    name: "Tynki wewnętrzne",
    description: "Tynki gipsowe lub cementowo-wapienne",
    category: "FINISHING",
    sortOrder: 12,
    completedByState: null,
    predecessorSlugs: ["electrical", "plumbing"],
    costPerM2Economy: 60,
    costPerM2Standard: 80,
    costPerM2Premium: 120,
    durationMinDays: 7,
    durationMaxDays: 14,
  },
  {
    slug: "floor_screeds",
    name: "Wylewki podłogowe",
    description: "Wylewki cementowe lub anhydrytowe, wyrównanie posadzek",
    category: "FINISHING",
    sortOrder: 13,
    completedByState: null,
    predecessorSlugs: ["heating", "interior_plaster"],
    costPerM2Economy: 40,
    costPerM2Standard: 55,
    costPerM2Premium: 80,
    durationMinDays: 3,
    durationMaxDays: 7,
  },
  {
    slug: "flooring",
    name: "Podłogi i posadzki",
    description: "Panele, gres, deska — montaż z materiałem",
    category: "FINISHING",
    sortOrder: 14,
    completedByState: null,
    predecessorSlugs: ["floor_screeds"],
    costPerM2Economy: 80,
    costPerM2Standard: 140,
    costPerM2Premium: 250,
    durationMinDays: 7,
    durationMaxDays: 14,
  },
  {
    slug: "painting",
    name: "Malowanie",
    description: "Gruntowanie i malowanie ścian i sufitów (2 warstwy)",
    category: "FINISHING",
    sortOrder: 15,
    completedByState: null,
    predecessorSlugs: ["interior_plaster"],
    costPerM2Economy: 18,
    costPerM2Standard: 25,
    costPerM2Premium: 40,
    durationMinDays: 5,
    durationMaxDays: 10,
  },
  {
    slug: "bathroom_fixtures",
    name: "Biały montaż",
    description: "Umywalki, WC, wanny/brodziki, baterie, armatura",
    category: "FINISHING",
    sortOrder: 16,
    completedByState: null,
    predecessorSlugs: ["plumbing", "flooring"],
    costPerM2Economy: 50,
    costPerM2Standard: 90,
    costPerM2Premium: 180,
    durationMinDays: 5,
    durationMaxDays: 10,
  },
  {
    slug: "interior_doors",
    name: "Drzwi wewnętrzne",
    description: "Montaż drzwi wewnętrznych z ościeżnicami",
    category: "FINISHING",
    sortOrder: 17,
    completedByState: null,
    predecessorSlugs: ["painting"],
    costPerM2Economy: 35,
    costPerM2Standard: 55,
    costPerM2Premium: 100,
    durationMinDays: 2,
    durationMaxDays: 5,
  },

  // --- OPTIONAL ---
  {
    slug: "garage_gate",
    name: "Brama garażowa",
    description: "Brama segmentowa z napędem (gdy garage_spots > 0)",
    category: "OPTIONAL",
    sortOrder: 18,
    completedByState: null,
    predecessorSlugs: ["walls"],
    costPerM2Economy: 0,
    costPerM2Standard: 0,
    costPerM2Premium: 0,
    durationMinDays: 1,
    durationMaxDays: 2,
  },
] as const;

// ---------------------------------------------------------------------------
// Stage cost modifiers
// ---------------------------------------------------------------------------

type ModifierInput = {
  stageSlug: string;
  triggerQuestionSlug: string;
  triggerValue: string;
  costAdjustmentPerM2: number;
  fixedCostAdjustment: number;
  description: string;
};

const modifiers: ModifierInput[] = [
  // Insulation level — percentage uplift on insulation-related stages (economy-tier pre-computed)
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
    description:
      "[PERCENT:30] Ocieplenie pasywne — rekuperacja i pompa ciepła",
  },

  // Windows — per-unit pricing by build standard (S-02 multiplies by window_count)
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 1200,
    description: "[PER_UNIT:window_count] Okno — standard ekonomiczny",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 2000,
    description: "[PER_UNIT:window_count] Okno — standard standardowy",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 3500,
    description: "[PER_UNIT:window_count] Okno — standard premium",
  },

  // Exterior doors — per-unit pricing by build standard (S-02 multiplies by exterior_door_count)
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 2500,
    description: "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard ekonomiczny",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 6500,
    description: "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard standardowy",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "PREMIUM",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 7000,
    description: "[PER_UNIT:exterior_door_count] Drzwi zewnętrzne — standard premium",
  },

  // Terrace doors — per-unit pricing by build standard
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 3000,
    description:
      "[PER_UNIT:terrace_door_count] Drzwi tarasowe — balkonowe zwykłe",
  },
  {
    stageSlug: "windows_doors",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 10000,
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

  // Balconies — per-unit pricing by build standard
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "build_standard",
    triggerValue: "ECONOMY",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 8000,
    description: "[PER_UNIT:balcony_count] Balkon — standard ekonomiczny",
  },
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "build_standard",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 14000,
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

  // Insulation level → garage gate (fixed cost)
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "STANDARD",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 7000,
    description: "Brama garażowa — izolacja standardowa",
  },
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "ENHANCED",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 10000,
    description: "Brama garażowa — podwyższona izolacja",
  },
  {
    stageSlug: "garage_gate",
    triggerQuestionSlug: "insulation_level",
    triggerValue: "PASSIVE",
    costAdjustmentPerM2: 0,
    fixedCostAdjustment: 13000,
    description: "Brama garażowa — klasa pasywna",
  },

  // Attic → floor slabs
  {
    stageSlug: "floor_slabs",
    triggerQuestionSlug: "has_attic",
    triggerValue: "true",
    costAdjustmentPerM2: 60,
    fixedCostAdjustment: 0,
    description: "Poddasze użytkowe — wzmocnienie stropu i schody wewnętrzne",
  },

  // Multi-story → walls
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

  // Multi-story → floor slabs
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

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function cleanupObsoleteSeedData() {
  console.log("Cleaning up obsolete seed data...");
  await prisma.questionDefinition
    .delete({ where: { slug: "has_terrace_doors" } })
    .catch(() => {});

  const removedModifiers = await prisma.stageCostModifier.deleteMany({
    where: {
      OR: [
        { triggerQuestionSlug: "has_terrace_doors" },
        {
          triggerQuestionSlug: "insulation_level",
          NOT: { description: { startsWith: "[PERCENT:" } },
        },
      ],
    },
  });
  console.log(`  ✓ removed ${removedModifiers.count} obsolete cost modifier(s)`);
}

async function seedQuestions() {
  console.log("Seeding question definitions...");
  for (const q of questions) {
    await prisma.questionDefinition.upsert({
      where: { slug: q.slug },
      update: {
        label: q.label,
        type: q.type,
        required: q.required,
        sortOrder: q.sortOrder,
        options: q.options ?? undefined,
        validation: q.validation ?? undefined,
        unit: q.unit,
      },
      create: {
        slug: q.slug,
        label: q.label,
        type: q.type,
        required: q.required,
        sortOrder: q.sortOrder,
        options: q.options ?? undefined,
        validation: q.validation ?? undefined,
        unit: q.unit,
      },
    });
  }
  console.log(`  ✓ ${questions.length} question definitions upserted`);
}

async function seedStages() {
  console.log("Seeding construction stages...");
  for (const s of stages) {
    await prisma.constructionStage.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        category: s.category,
        sortOrder: s.sortOrder,
        completedByState: s.completedByState,
        predecessorSlugs: [...s.predecessorSlugs],
        costPerM2Economy: s.costPerM2Economy,
        costPerM2Standard: s.costPerM2Standard,
        costPerM2Premium: s.costPerM2Premium,
        durationMinDays: s.durationMinDays,
        durationMaxDays: s.durationMaxDays,
      },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        sortOrder: s.sortOrder,
        completedByState: s.completedByState,
        predecessorSlugs: [...s.predecessorSlugs],
        costPerM2Economy: s.costPerM2Economy,
        costPerM2Standard: s.costPerM2Standard,
        costPerM2Premium: s.costPerM2Premium,
        durationMinDays: s.durationMinDays,
        durationMaxDays: s.durationMaxDays,
      },
    });
  }
  console.log(`  ✓ ${stages.length} construction stages upserted`);
}

async function seedModifiers() {
  console.log("Seeding cost modifiers...");
  let count = 0;

  for (const m of modifiers) {
    const stage = await prisma.constructionStage.findUnique({
      where: { slug: m.stageSlug },
    });
    if (!stage) {
      console.warn(`  ⚠ Stage "${m.stageSlug}" not found — skipping modifier`);
      continue;
    }

    const existing = await prisma.stageCostModifier.findFirst({
      where: {
        stageId: stage.id,
        triggerQuestionSlug: m.triggerQuestionSlug,
        triggerValue: m.triggerValue,
        description: m.description,
      },
    });

    if (existing) {
      await prisma.stageCostModifier.update({
        where: { id: existing.id },
        data: {
          costAdjustmentPerM2: m.costAdjustmentPerM2,
          fixedCostAdjustment: m.fixedCostAdjustment,
          description: m.description,
        },
      });
    } else {
      await prisma.stageCostModifier.create({
        data: {
          stageId: stage.id,
          triggerQuestionSlug: m.triggerQuestionSlug,
          triggerValue: m.triggerValue,
          costAdjustmentPerM2: m.costAdjustmentPerM2,
          fixedCostAdjustment: m.fixedCostAdjustment,
          description: m.description,
        },
      });
    }
    count++;
  }

  console.log(`  ✓ ${count} cost modifiers upserted`);
}

// ---------------------------------------------------------------------------
// Market benchmarks (S-04)
// ---------------------------------------------------------------------------

type MarketBenchmarkSeedRow = {
  stageCategory: string;
  multiplier: number;
  sourceName: string;
  sourceUrl?: string | null;
};

async function seedMarketBenchmarks() {
  console.log("Seeding market benchmarks...");
  const filePath = path.join(seedDir, "data/market-benchmarks.json");
  const raw = await readFile(filePath, "utf-8");
  const rows = JSON.parse(raw) as MarketBenchmarkSeedRow[];
  const fetchedAt = new Date();

  for (const row of rows) {
    await prisma.marketBenchmark.upsert({
      where: { stageCategory: row.stageCategory },
      create: {
        stageCategory: row.stageCategory,
        multiplier: row.multiplier,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl ?? null,
        fetchedAt,
      },
      update: {
        multiplier: row.multiplier,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl ?? null,
        fetchedAt,
      },
    });
  }

  console.log(`  ✓ ${rows.length} market benchmarks upserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting seed...\n");
  await cleanupObsoleteSeedData();
  await seedQuestions();
  await seedStages();
  await seedModifiers();
  await seedMarketBenchmarks();
  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
